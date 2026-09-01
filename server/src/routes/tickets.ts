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
