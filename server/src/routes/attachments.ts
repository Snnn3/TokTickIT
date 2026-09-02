import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireRequester, AuthenticatedRequest } from "../middleware/requester";

export const attachmentsRouter = Router();

// GET /api/attachments/:id [BR-06, AC-03]
attachmentsRouter.get(
  "/:id",
  requireRequester,
  async (req: AuthenticatedRequest, res: Response) => {
    const requester = req.requester!;
    const attachmentId = parseInt(req.params.id, 10);

    if (isNaN(attachmentId) || attachmentId <= 0) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Attachment ID must be a positive integer",
        },
      });
    }

    try {
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        include: {
          ticket: {
            select: { requesterId: true },
          },
        },
      });

      if (!attachment) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        });
      }

      if (attachment.ticket.requesterId !== requester.id) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Access denied",
          },
        });
      }

      return res.status(200).json({
        attachment: {
          id: attachment.id,
          ticketId: attachment.ticketId,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          uploadedAt: attachment.uploadedAt,
          removedAt: attachment.removedAt,
          removedReason: attachment.removedReason,
        },
      });
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
    const attachmentId = parseInt(req.params.id, 10);

    if (isNaN(attachmentId) || attachmentId <= 0) {
      return res.status(400).json({
        error: {
          code: "INVALID_ID",
          message: "Attachment ID must be a positive integer",
        },
      });
    }

    try {
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        include: {
          ticket: {
            select: { requesterId: true },
          },
        },
      });

      if (!attachment) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        });
      }

      if (attachment.ticket.requesterId !== requester.id) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Access denied",
          },
        });
      }

      if (attachment.removedAt !== null) {
        return res.status(410).json({
          error: {
            code: "REMOVED",
            message: "Attachment has been removed and cannot be downloaded",
          },
        });
      }

      res.setHeader("Content-Type", attachment.mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
      );
      res.setHeader("Content-Length", attachment.sizeBytes);

      return res.status(200).send(Buffer.from(attachment.data));
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
    const attachmentId = parseInt(req.params.id, 10);

    if (isNaN(attachmentId) || attachmentId <= 0) {
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
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        include: {
          ticket: {
            select: { requesterId: true },
          },
        },
      });

      if (!attachment) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Attachment not found",
          },
        });
      }

      if (attachment.ticket.requesterId !== requester.id) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Access denied",
          },
        });
      }

      if (attachment.removedAt !== null) {
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

      return res.status(200).json({
        removed: true,
        removedAt: updated.removedAt,
        attachment: {
          id: updated.id,
          ticketId: updated.ticketId,
          filename: updated.filename,
          mimeType: updated.mimeType,
          sizeBytes: updated.sizeBytes,
          uploadedAt: updated.uploadedAt,
          removedAt: updated.removedAt,
          removedReason: updated.removedReason,
        },
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
