import { ActionStatus, type Prisma } from "@prisma/client";
import { USER_REF_SELECT } from "./user-ref";

export const ACTIVE_ACTION_STATUSES: ActionStatus[] = [
  ActionStatus.PLANNED,
  ActionStatus.IN_PROGRESS,
];

export const ACTION_SUMMARY_INCLUDE = {
  ticket: { select: { number: true } },
  performedBy: { select: USER_REF_SELECT },
  assignee: { select: USER_REF_SELECT },
} satisfies Prisma.ActionTakenInclude;

type ActionSummaryRow = Prisma.ActionTakenGetPayload<{
  include: typeof ACTION_SUMMARY_INCLUDE;
}>;

export function serializeActionSummary(action: ActionSummaryRow) {
  return {
    id: action.id,
    ticketId: action.ticketId,
    ticketNumber: action.ticket.number,
    title: action.title,
    status: action.status,
    performedBy: action.performedBy,
    assignee: action.assignee,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
    version: action.version,
  };
}
