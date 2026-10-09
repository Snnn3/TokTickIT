import { Prisma, Role } from "@prisma/client";
import { Router, type Response } from "express";
import {
  AuthenticatedRequest,
  requireAuth,
  requireRole,
} from "../middleware/auth";
import { prisma } from "../prisma";
import { hasRequestBody } from "../utils/request-body";
import { sendUnexpectedError } from "../utils/unexpected-response";
import { OPEN_TICKET_STATUSES, TICKET_STATUSES } from "../utils/ticketStatus";
import { USER_REF_SELECT } from "../utils/user-ref";
import {
  ACTIVE_ACTION_STATUSES,
  ACTION_SUMMARY_INCLUDE,
  serializeActionSummary,
} from "../utils/action-summary";

const STAFF_ROLES = [Role.IT_STAFF, Role.ADMINISTRATOR] as const;
const STAFF_TICKET_SELECT = {
  id: true,
  number: true,
  summary: true,
  status: true,
  requestedPriority: true,
  itPriority: true,
  owner: { select: USER_REF_SELECT },
  version: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
} satisfies Prisma.TicketSelect;

export const dashboardRouter = Router();

function rejectReadInput(req: AuthenticatedRequest, res: Response): boolean {
  if (Object.keys(req.query).length > 0) {
    res.status(400).json({
      error: {
        code: "INVALID_QUERY",
        message: "This endpoint does not accept query parameters",
      },
    });
    return true;
  }

  if (hasRequestBody(req)) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "This endpoint does not accept a request body",
      },
    });
    return true;
  }

  return false;
}

// GET /api/dashboard/staff [AC-12, AC-13, AC-16]
dashboardRouter.get(
  "/staff",
  ...requireAuth,
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    if (rejectReadInput(req, res)) return;

    const actorId = req.authUser!.id;
    const asOf = new Date();
    const from = new Date(asOf.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      const snapshot = await prisma.$transaction(
        async (tx) => {
          const openWhere: Prisma.TicketWhereInput = {
            status: { in: OPEN_TICKET_STATUSES },
          };
          const [
            openTickets,
            unassignedTickets,
            myOwnedTickets,
            myActiveActions,
            recentTickets,
            myRecentActions,
            statusCounts,
          ] = await Promise.all([
            tx.ticket.count({ where: openWhere }),
            tx.ticket.count({ where: { ...openWhere, ownerId: null } }),
            tx.ticket.count({ where: { ...openWhere, ownerId: actorId } }),
            tx.actionTaken.count({
              where: {
                performedById: actorId,
                status: {
                  in: ACTIVE_ACTION_STATUSES,
                },
              },
            }),
            tx.ticket.findMany({
              where: {
                ...openWhere,
                updatedAt: { gte: from, lte: asOf },
              },
              orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
              take: 5,
              select: STAFF_TICKET_SELECT,
            }),
            tx.actionTaken.findMany({
              where: {
                performedById: actorId,
                createdAt: { gte: from, lte: asOf },
              },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              take: 5,
              include: ACTION_SUMMARY_INCLUDE,
            }),
            tx.ticket.groupBy({ by: ["status"], _count: { _all: true } }),
          ]);

          return {
            metrics: {
              openTickets,
              unassignedTickets,
              myOwnedTickets,
              myActiveActions,
            },
            groupings: {
              ticketsByStatus: TICKET_STATUSES.map((status) => ({
                status,
                count:
                  statusCounts.find((group) => group.status === status)?._count
                    ._all ?? 0,
              })),
            },
            lists: {
              recentTickets,
              myRecentActions: myRecentActions.map(serializeActionSummary),
            },
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
      );

      return res.status(200).json({ asOf, windowDays: 7, ...snapshot });
    } catch {
      return sendUnexpectedError(res, "Failed to load the staff dashboard");
    }
  }
);
