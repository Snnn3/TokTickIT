import { Router, Response } from "express";
import multer from "multer";
import { prisma } from "../prisma";
import { requireRequester, AuthenticatedRequest } from "../middleware/requester";
import { generateTicketNumber } from "../utils/ticketNumber";
import { TicketPriority, TicketStatus, Prisma } from "@prisma/client";

export const ticketsRouter = Router();

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
});

function hasValidExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

interface ValidationResult {
  valid: boolean;
  summary: string;
  description: string;
  categoryId: number;
  systemId: number;
  requestedPriority: TicketPriority;
  details: { field: string; issue: string }[];
}

function validateTicketPayload(body: any): ValidationResult {
  const details: { field: string; issue: string }[] = [];

  const rawSummary = body.summary;
  const summary = typeof rawSummary === "string" ? rawSummary.trim() : "";
  if (!summary || summary.length < 1) {
    details.push({ field: "summary", issue: "Summary is required" });
  } else if (summary.length > 150) {
    details.push({
      field: "summary",
      issue: "Summary must not exceed 150 characters",
    });
  }

  const rawDescription = body.description;
  const description =
    typeof rawDescription === "string" ? rawDescription.trim() : "";
  if (!description || description.length < 1) {
    details.push({ field: "description", issue: "Description is required" });
  } else if (description.length > 5000) {
    details.push({
      field: "description",
      issue: "Description must not exceed 5000 characters",
    });
  }

  const categoryId = parseInt(body.categoryId, 10);
  if (isNaN(categoryId) || categoryId <= 0) {
    details.push({
      field: "categoryId",
      issue: "Valid category is required",
    });
  }

  const systemId = parseInt(body.systemId, 10);
  if (isNaN(systemId) || systemId <= 0) {
    details.push({
      field: "systemId",
      issue: "Valid related system is required",
    });
  }

  const rawPriority = body.requestedPriority;
  const validPriorities = Object.values(TicketPriority);
  if (!rawPriority || !validPriorities.includes(rawPriority as TicketPriority)) {
    details.push({
      field: "requestedPriority",
      issue: "Requested priority must be LOW, MEDIUM, or HIGH",
    });
  }

  return {
    valid: details.length === 0,
    summary,
    description,
    categoryId,
    systemId,
    requestedPriority: rawPriority as TicketPriority,
    details,
  };
}

async function createTicketTransaction(
  tx: Prisma.TransactionClient,
  requesterId: number,
  requesterName: string,
  payload: {
    categoryId: number;
    systemId: number;
    summary: string;
    description: string;
    requestedPriority: TicketPriority;
  },
  files: Express.Multer.File[],
) {
  const category = await tx.category.findFirst({
    where: { id: payload.categoryId, isActive: true },
  });
  if (!category) {
    throw { status: 400, field: "categoryId", message: "Category not found or inactive" };
  }

  const system = await tx.relatedSystem.findFirst({
    where: { id: payload.systemId, isActive: true },
  });
  if (!system) {
    throw { status: 400, field: "systemId", message: "Related system not found or inactive" };
  }

  const ticketNumber = await generateTicketNumber(tx);

  const ticket = await tx.ticket.create({
    data: {
      number: ticketNumber,
      requesterId,
      categoryId: payload.categoryId,
      systemId: payload.systemId,
      summary: payload.summary,
      description: payload.description,
      requestedPriority: payload.requestedPriority,
      status: TicketStatus.NEW,
    },
  });

  const createdAttachments = [];
  for (const file of files) {
    const attachment = await tx.attachment.create({
      data: {
        ticketId: ticket.id,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        data: Buffer.from(file.buffer),
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
      },
    });
    createdAttachments.push(attachment);
  }

  return {
    id: ticket.id,
    number: ticket.number,
    ticketDate: ticket.ticketDate,
    status: ticket.status,
    requestedPriority: ticket.requestedPriority,
    summary: ticket.summary,
    description: ticket.description,
    categoryId: ticket.categoryId,
    systemId: ticket.systemId,
    requester: {
      id: requesterId,
      name: requesterName,
    },
    attachments: createdAttachments,
  };
}

interface QueryValidationResult {
  valid: boolean;
  search?: string;
  categoryId?: number;
  priority?: TicketPriority;
  status?: TicketStatus;
  sort: string;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
  details: { parameter: string; issue: string }[];
}

function validateTicketQuery(query: any): QueryValidationResult {
  const details: { parameter: string; issue: string }[] = [];

  // Parse and validate search
  let search: string | undefined;
  if (query.search !== undefined) {
    if (typeof query.search !== "string") {
      details.push({ parameter: "search", issue: "Search must be a string" });
    } else {
      const trimmed = query.search.trim();
      if (trimmed.length > 150) {
        details.push({
          parameter: "search",
          issue: "Search query must not exceed 150 characters",
        });
      } else if (trimmed.length > 0) {
        search = trimmed;
      }
    }
  }

  // Parse and validate categoryId
  let categoryId: number | undefined;
  if (query.categoryId !== undefined) {
    const parsed = parseInt(String(query.categoryId), 10);
    if (isNaN(parsed) || parsed <= 0) {
      details.push({
        parameter: "categoryId",
        issue: "Category ID must be a positive integer",
      });
    } else {
      categoryId = parsed;
    }
  }

  // Parse and validate priority
  let priority: TicketPriority | undefined;
  if (query.priority !== undefined) {
    const p = String(query.priority);
    if (!Object.values(TicketPriority).includes(p as TicketPriority)) {
      details.push({
        parameter: "priority",
        issue: "Priority must be LOW, MEDIUM, or HIGH",
      });
    } else {
      priority = p as TicketPriority;
    }
  }

  // Parse and validate status
  let status: TicketStatus | undefined;
  if (query.status !== undefined) {
    const s = String(query.status);
    if (s !== "NEW") {
      details.push({
        parameter: "status",
        issue: "Status must be NEW",
      });
    } else {
      status = TicketStatus.NEW;
    }
  }

  // Parse and validate sort
  const allowedSorts = ["updatedAt", "createdAt", "number"];
  let sort = "updatedAt";
  if (query.sort !== undefined) {
    const s = String(query.sort);
    if (!allowedSorts.includes(s)) {
      details.push({
        parameter: "sort",
        issue: "Sort field must be updatedAt, createdAt, or number",
      });
    } else {
      sort = s;
    }
  }

  // Parse and validate order
  let order: "asc" | "desc" = "desc";
  if (query.order !== undefined) {
    const o = String(query.order).toLowerCase();
    if (o !== "asc" && o !== "desc") {
      details.push({
        parameter: "order",
        issue: "Order must be asc or desc",
      });
    } else {
      order = o as "asc" | "desc";
    }
  }

  // Parse and validate page
  let page = 1;
  if (query.page !== undefined) {
    const parsed = parseInt(String(query.page), 10);
    if (isNaN(parsed) || parsed < 1) {
      details.push({
        parameter: "page",
        issue: "Page must be an integer >= 1",
      });
    } else {
      page = parsed;
    }
  }

  // Parse and validate pageSize
  const allowedPageSizes = [5, 10, 20];
  let pageSize = 10;
  if (query.pageSize !== undefined) {
    const parsed = parseInt(String(query.pageSize), 10);
    if (isNaN(parsed) || !allowedPageSizes.includes(parsed)) {
      details.push({
        parameter: "pageSize",
        issue: "Page size must be 5, 10, or 20",
      });
    } else {
      pageSize = parsed;
    }
  }

  return {
    valid: details.length === 0,
    search,
    categoryId,
    priority,
    status,
    sort,
    order,
    page,
    pageSize,
    details,
  };
}

// GET /api/tickets [FR-08, BR-04, BR-19..BR-22, AC-16]
ticketsRouter.get(
  "/",
  requireRequester,
  async (req: AuthenticatedRequest, res: Response) => {
    const requester = req.requester!;
    const validation = validateTicketQuery(req.query);

    if (!validation.valid) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query parameters",
          details: validation.details,
        },
      });
    }

    const { search, categoryId, priority, status, sort, order, page, pageSize } =
      validation;

    try {
      const where: Prisma.TicketWhereInput = {
        requesterId: requester.id,
      };

      if (search) {
        where.OR = [
          { number: { contains: search, mode: "insensitive" } },
          { summary: { contains: search, mode: "insensitive" } },
        ];
      }

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (priority) {
        where.requestedPriority = priority;
      }

      if (status) {
        where.status = status;
      }

      const orderBy: Prisma.TicketOrderByWithRelationInput[] =
        sort === "number"
          ? [{ number: order }]
          : [{ [sort]: order }, { number: "desc" }];

      const skip = (page - 1) * pageSize;
      const take = pageSize;

      const [total, tickets] = await Promise.all([
        prisma.ticket.count({ where }),
        prisma.ticket.findMany({
          where,
          orderBy,
          skip,
          take,
          include: {
            category: { select: { name: true } },
            system: { select: { name: true } },
          },
        }),
      ]);

      const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

      const mappedTickets = tickets.map((t) => ({
        id: t.id,
        number: t.number,
        summary: t.summary,
        categoryId: t.categoryId,
        categoryName: t.category?.name || "Unknown",
        systemId: t.systemId,
        systemName: t.system?.name || "Unknown",
        requestedPriority: t.requestedPriority,
        status: t.status,
        ticketDate: t.ticketDate,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));

      return res.status(200).json({
        tickets: mappedTickets,
        page,
        pageSize,
        total,
        totalPages,
      });
    } catch (error) {
      return res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "Failed to retrieve tickets",
        },
      });
    }
  },
);

// POST /api/tickets [FR-05, BR-01, BR-07..BR-11, BR-13, BR-14, AC-01]
ticketsRouter.post(
  "/",
  requireRequester,
  (req, res, next) => {
    upload.array("files")(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            error: {
              code: "FILE_TOO_LARGE",
              message: "Attachment exceeds the maximum allowed size of 5 MB",
            },
          });
        }
        return res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: err.message,
          },
        });
      } else if (err) {
        return res.status(500).json({
          error: {
            code: "UNEXPECTED",
            message: "Failed to process multipart upload",
          },
        });
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response) => {
    const requester = req.requester!;
    const files = (req.files as Express.Multer.File[]) || [];

    // Check file count constraint [BR-13]
    if (files.length > 5) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Maximum 5 active attachments allowed per ticket",
          details: [{ field: "files", issue: "Maximum 5 attachments allowed" }],
        },
      });
    }

    // Check MIME types and safe extensions [BR-13, AC-07]
    for (const file of files) {
      if (
        !ALLOWED_MIME_TYPES.includes(file.mimetype) ||
        !hasValidExtension(file.originalname)
      ) {
        return res.status(415).json({
          error: {
            code: "UNSUPPORTED_TYPE",
            message: `Unsupported file type for "${file.originalname}". Allowed types: JPG, PNG, WEBP, PDF`,
          },
        });
      }
    }

    // Field-level validation [BR-07..BR-11]
    const validation = validateTicketPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Form validation failed",
          details: validation.details,
        },
      });
    }

    try {
      // Execute within database transaction for atomicity [BR-01, BR-14, AC-10]
      const createdTicket = await prisma.$transaction(async (tx) => {
        return createTicketTransaction(
          tx,
          requester.id,
          requester.name,
          validation,
          files,
        );
      });

      return res.status(201).json({ ticket: createdTicket });
    } catch (error: any) {
      if (error?.status === 400) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: error.message,
            details: [{ field: error.field, issue: error.message }],
          },
        });
      }
      return res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "An unexpected error occurred while creating the ticket",
        },
      });
    }
  },
);
