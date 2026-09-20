import { TicketStatus } from "@prisma/client";

/**
 * Strict status transition matrix [BR-13].
 *
 * "Staff" below means an IT Staff or Administrator user who is not the
 * ticket's requester (BR-25); the matrix itself is role-agnostic and the
 * routes apply the role and self-service checks around it. Closed and
 * Cancelled are terminal: nothing transitions out of them [BR-12].
 */
export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.NEW]: [TicketStatus.OPEN, TicketStatus.CANCELLED],
  [TicketStatus.OPEN]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.IN_PROGRESS]: [
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.WAITING_FOR_REQUESTER]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  [TicketStatus.REOPENED]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.CLOSED]: [],
  [TicketStatus.CANCELLED]: [],
};

export function getLegalTargets(from: TicketStatus | string): TicketStatus[] {
  return ALLOWED_TRANSITIONS[from as TicketStatus] ?? [];
}

export function isTransitionAllowed(
  from: TicketStatus | string,
  to: TicketStatus | string
): boolean {
  return getLegalTargets(from).includes(to as TicketStatus);
}

export function isTerminalStatus(status: TicketStatus | string): boolean {
  return status === TicketStatus.CLOSED || status === TicketStatus.CANCELLED;
}
