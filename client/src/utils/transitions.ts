import type { TicketStatus } from "../types/ticket";

/**
 * Client mirror of the server transition matrix [BR-13].
 *
 * The select offers only the legal targets for the current status, so an
 * illegal transition is unrepresentable before the server refuses it. The
 * server remains the authority: a rejected transition surfaces its message.
 */
export const LEGAL_STATUS_TARGETS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  CLOSED: [],
  CANCELLED: [],
};

export function legalStatusTargets(from: TicketStatus): TicketStatus[] {
  return LEGAL_STATUS_TARGETS[from] ?? [];
}

export function needsStatusConfirm(target: TicketStatus): boolean {
  return target === "CLOSED" || target === "CANCELLED";
}
