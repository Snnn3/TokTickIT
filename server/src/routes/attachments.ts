import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireRequester, AuthenticatedRequest } from "../middleware/requester";

export const attachmentsRouter = Router();

export function parsePositiveIntParam(paramValue: string | undefined): number | null {
  const trimmed = String(paramValue || "").trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const id = parseInt(trimmed, 10);
  return id > 0 ? id : null;
}

export function serializeAttachment(att: {
  id: number;
  ticketId: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date | string;
  removedAt: Date | string | null;
  removedReason: string | null;
}) {
  return {
    id: att.id,
    ticketId: att.ticketId,
    filename: att.filename,
    mimeType: att.mimeType,
    sizeBytes: att.sizeBytes,
    uploadedAt: att.uploadedAt,
    removedAt: att.removedAt,
    removedReason: att.removedReason,
  };
}

/**
 * Shared helper to load an attachment and enforce ticket ownership [BR-06, AC-03]
 */
async function getOwnedAttachment(
  attachmentId: number,
  requesterId: number,
) {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      ticket: {
        select: { requesterId: true },
      },
    },
  });

  if (!attachment) {
    return { status: 404, error: { code: "NOT_FOUND", message: "Attachment not found" } };
  }

  if (attachment.ticket.requesterId !== requesterId) {
    return { status: 403, error: { code: "FORBIDDEN", message: "Access denied" } };
  }

  return { status: 200, attachment };
}

// GET /api/attachments/:id [BR-06, AC-03]
attachmentsRouter.get(
  "/:id",
  requireRequester,
  async (req: AuthenticatedRequest, res: Response) => {
    const requester = req.requester!;
    const attachmentId = parsePositiveIntParam(req.params.id);

    if (!attachmentId) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Attachment ID must be a positive integer",
        },
      });
    }

    try {
      const result = await getOwnedAttachment(attachmentId, requester.id);
      if (result.status !== 200) {
        return res.status(result.status).json({ error: result.error });
      }

      return res.status(200).json(serializeAttachment(result.attachment!));
    } catch {
      return res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "Failed to retrieve attachment",
        },
      });
    }
  },
);

// GET /api/attachments/:id/download [FR-11, BR-16, AC-11]
attachmentsRouter.get(
  "/:id/download",
  requireRequester,
  async (req: AuthenticatedRequest, res: Response) => {
    const requester = req.requester!;
    const attachmentId = parsePositiveIntParam(req.params.id);

    if (!attachmentId) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Attachment ID must be a positive integer",
        },
      });
    }

    try {
      const result = await getOwnedAttachment(attachmentId, requester.id);
      if (result.status !== 200) {
        return res.status(result.status).json({ error: result.error });
      }

      const att = result.attachment!;
      if (att.removedAt !== null) {
        return res.status(410).json({
          error: {
            code: "REMOVED",
            message: "Attachment has been removed and cannot be downloaded",
          },
        });
      }

      const safeFilename = att.filename.replace(/"/g, '\\"');
      res.setHeader("Content-Type", att.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
      res.setHeader("Content-Length", att.sizeBytes);

      return res.status(200).send(Buffer.from(att.data));
    } catch {
      return res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "Failed to download attachment",
        },
      });
    }
  },
);

// DELETE /api/attachments/:id [FR-12, BR-16, BR-17, AC-12]
attachmentsRouter.delete(
  "/:id",
  requireRequester,
  async (req: AuthenticatedRequest, res: Response) => {
    const requester = req.requester!;
    const attachmentId = parsePositiveIntParam(req.params.id);

    if (!attachmentId) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Attachment ID must be a positive integer",
        },
      });
    }

    const rawReason = req.body?.reason;
    const reason = typeof rawReason === "string" ? rawReason.trim() : "";

    if (!reason || reason.length < 1 || reason.length > 300) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Removal reason is required (1 to 300 characters)",
          details: [
            {
              field: "reason",
              issue: "Removal reason must be between 1 and 300 characters",
            },
          ],
        },
      });
    }

    try {
      const result = await getOwnedAttachment(attachmentId, requester.id);
      if (result.status !== 200) {
        return res.status(result.status).json({ error: result.error });
      }

      const att = result.attachment!;
      if (att.removedAt !== null) {
        return res.status(409).json({
          error: {
            code: "ALREADY_REMOVED",
            message: "Attachment is already removed",
          },
        });
      }

      const updated = await prisma.attachment.update({
        where: { id: attachmentId },
        data: {
          removedAt: new Date(),
          removedReason: reason,
        },
      });

      // Response per api-spec.md:140
      return res.status(200).json({
        removed: true,
        removedAt: updated.removedAt,
      });
    } catch {
      return res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "Failed to remove attachment",
        },
      });
    }
  },
);
