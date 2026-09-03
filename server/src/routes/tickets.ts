import { Router, Response } from "express";
import multer from "multer";
import { prisma } from "../prisma";
import { requireRequester, AuthenticatedRequest } from "../middleware/requester";
import { generateTicketNumber } from "../utils/ticketNumber";
import { TicketPriority, TicketStatus, Prisma } from "@prisma/client";
import { parsePositiveIntParam, serializeAttachment } from "../utils/attachment";
import { getOwnedResource } from "../utils/ownership";

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

function handleMulterError(err: unknown, res: Response): boolean {
  if (!err) return false;
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        error: {
          code: "FILE_TOO_LARGE",
          message: "Attachment exceeds the maximum allowed size of 5 MB",
        },
      });
      return true;
    }
    res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: err.message,
      },
    });
    return true;
  }
  res.status(500).json({
    error: {
      code: "UNEXPECTED",
      message: "Failed to process attachment upload",
    },
  });
  return true;
}

function isValidAttachmentFile(file: Express.Multer.File): boolean {
  return ALLOWED_MIME_TYPES.includes(file.mimetype) && hasValidExtension(file.originalname);
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
  details: { field: string; parameter: string; issue: string }[];
}

function parseStrictInteger(
  value: unknown,
  parameter: string,
  issue: string,
  details: { field: string; parameter: string; issue: string }[],
  options?: { min?: number; allowed?: number[] },
): number | undefined {
  if (value === undefined) return undefined;
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) {
    details.push({ field: parameter, parameter, issue });
    return undefined;
  }
  const parsed = parseInt(raw, 10);
  if (options?.min !== undefined && parsed < options.min) {
    details.push({ field: parameter, parameter, issue });
    return undefined;
  }
  if (options?.allowed !== undefined && !options.allowed.includes(parsed)) {
    details.push({ field: parameter, parameter, issue });
    return undefined;
  }
  return parsed;
}

function validateTicketQuery(
  query: Record<string, unknown>,
): QueryValidationResult {
  const details: { field: string; parameter: string; issue: string }[] = [];

  // Parse and validate search
  let search: string | undefined;
  if (query.search !== undefined) {
    if (typeof query.search !== "string") {
      details.push({ field: "search", parameter: "search", issue: "Search must be a string" });
    } else {
      const trimmed = query.search.trim();
      if (trimmed.length > 150) {
        details.push({
          field: "search",
          parameter: "search",
          issue: "Search query must not exceed 150 characters",
        });
      } else if (trimmed.length > 0) {
        search = trimmed;
      }
    }
  }

  // Parse and validate categoryId
  const categoryId = parseStrictInteger(
    query.categoryId,
    "categoryId",
    "Category ID must be a positive integer",
    details,
    { min: 1 },
  );

  // Parse and validate priority
  let priority: TicketPriority | undefined;
  if (query.priority !== undefined) {
    const p = String(query.priority);
    if (!Object.values(TicketPriority).includes(p as TicketPriority)) {
      details.push({
        field: "priority",
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
        field: "status",
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
        field: "sort",
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
        field: "order",
        parameter: "order",
        issue: "Order must be asc or desc",
      });
    } else {
      order = o as "asc" | "desc";
    }
  }

  // Parse and validate page
  const page =
    parseStrictInteger(
      query.page,
      "page",
      "Page must be an integer >= 1",
      details,
      { min: 1 },
    ) ?? 1;

  // Parse and validate pageSize
  const pageSize =
    parseStrictInteger(
      query.pageSize,
      "pageSize",
      "Page size must be 5, 10, or 20",
      details,
      { allowed: [5, 10, 20] },
    ) ?? 10;

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
          : [{ [sort]: order }, { number: order }];

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
        requestedPriority: t.requestedPriority,
        status: t.status,
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
      if (handleMulterError(err, res)) return;
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
      if (!isValidAttachmentFile(file)) {
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

/**
 * Shared helper to load a ticket and enforce requester ownership [BR-06, AC-03]
 */
type TicketDetailOptions = {
  include: {
    requester: { select: { id: true; name: true } };
    attachments: {
      orderBy: { uploadedAt: "asc" };
      select: {
        id: true;
        ticketId: true;
        filename: true;
        mimeType: true;
        sizeBytes: true;
        uploadedAt: true;
        removedAt: true;
        removedReason: true;
      };
    };
  };
};

type TicketOwnershipOptions = {
  select: { id: true; requesterId: true };
};

type OwnedTicketFailure = {
  status: 404 | 403;
  error: { code: "NOT_FOUND" | "FORBIDDEN"; message: string };
  ticket: null;
};

async function getOwnedTicket(
  ticketId: number,
  requesterId: number,
  options: TicketDetailOptions,
): Promise<
  | { status: 200; error: null; ticket: Prisma.TicketGetPayload<TicketDetailOptions> }
  | OwnedTicketFailure
>;
async function getOwnedTicket(
  ticketId: number,
  requesterId: number,
  options: TicketOwnershipOptions,
): Promise<
  | { status: 200; error: null; ticket: Prisma.TicketGetPayload<TicketOwnershipOptions> }
  | OwnedTicketFailure
>;
async function getOwnedTicket(
  ticketId: number,
  requesterId: number,
  options: TicketDetailOptions | TicketOwnershipOptions,
) {
  const result = await getOwnedResource(
    () =>
      "include" in options
        ? prisma.ticket.findUnique({
            where: { id: ticketId },
            include: options.include,
          })
        : prisma.ticket.findUnique({
            where: { id: ticketId },
            select: options.select,
          }),
    (ticket) => ticket.requesterId === requesterId,
    "Ticket not found",
  );

  if (result.status !== 200) {
    return { status: result.status, error: result.error, ticket: null };
  }

  return { status: 200 as const, error: null, ticket: result.resource };
}

// GET /api/tickets/:id [FR-09, FR-13, BR-06, AC-03]
ticketsRouter.get(
  "/:id",
  requireRequester,
  async (req: AuthenticatedRequest, res: Response) => {
    const requester = req.requester!;
    const ticketId = parsePositiveIntParam(req.params.id);

    if (!ticketId) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Ticket ID must be a positive integer",
        },
      });
    }

    try {
      const owned = await getOwnedTicket(ticketId, requester.id, {
        include: {
          requester: { select: { id: true, name: true } },
          attachments: {
            orderBy: { uploadedAt: "asc" },
            select: {
              id: true,
              ticketId: true,
              filename: true,
              mimeType: true,
              sizeBytes: true,
              uploadedAt: true,
              removedAt: true,
              removedReason: true,
            },
          },
        },
      });

      if (owned.status !== 200 || !owned.ticket) {
        return res.status(owned.status).json({ error: owned.error });
      }

      const ticket = owned.ticket;

      // Canonical ticket shape matching POST response plus attachments array [api-spec.md:104, 56-60, ui-spec.md:122-123]
      return res.status(200).json({
        ticket: {
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
            id: ticket.requester?.id ?? ticket.requesterId,
            name: ticket.requester?.name ?? "Unknown",
          },
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          attachments: (ticket.attachments || []).map((a) => serializeAttachment(a)),
        },
      });
    } catch {
      return res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "Failed to retrieve ticket",
        },
      });
    }
  },
);

// POST /api/tickets/:id/attachments [FR-10, BR-13, BR-15, AC-07..AC-09]
ticketsRouter.post(
  "/:id/attachments",
  requireRequester,
  (req, res, next) => {
    upload.single("file")(req, res, (err: any) => {
      if (handleMulterError(err, res)) return;
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response) => {
    const requester = req.requester!;
    const ticketId = parsePositiveIntParam(req.params.id);

    if (!ticketId) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Ticket ID must be a positive integer",
        },
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "File is required",
          details: [{ field: "file", issue: "Attachment file is required" }],
        },
      });
    }

    // Check MIME type and extension
    if (!isValidAttachmentFile(file)) {
      return res.status(415).json({
        error: {
          code: "UNSUPPORTED_TYPE",
          message: `Unsupported file type for "${file.originalname}". Allowed types: JPG, PNG, WEBP, PDF`,
        },
      });
    }

    try {
      const owned = await getOwnedTicket(ticketId, requester.id, {
        select: { id: true, requesterId: true },
      });

      if (owned.status !== 200 || !owned.ticket) {
        return res.status(owned.status).json({ error: owned.error });
      }

      const activeAttachmentsCount = await prisma.attachment.count({
        where: {
          ticketId,
          removedAt: null,
        },
      });

      if (activeAttachmentsCount >= 5) {
        return res.status(409).json({
          error: {
            code: "LIMIT_REACHED",
            message: "Ticket already has maximum 5 active attachments",
          },
        });
      }

      const attachment = await prisma.attachment.create({
        data: {
          ticketId,
          filename: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          data: Buffer.from(file.buffer),
        },
      });

      // Response per api-spec.md:114 (- 201: attachment metadata object)
      return res.status(201).json(serializeAttachment(attachment));
    } catch {
      return res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "Failed to upload attachment",
        },
      });
    }
  },
);
