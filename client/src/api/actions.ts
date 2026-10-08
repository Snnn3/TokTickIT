import type { ActionStatus } from "../types/action";

export interface CreateActionPayload {
  title: string;
  details: string;
  assigneeId: number | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  expectedTicketVersion: number;
}

export interface UpdateActionPayload {
  expectedVersion: number;
  expectedTicketVersion: number;
  title: string;
  details: string;
  result: string | null;
  assigneeId: number | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  status: ActionStatus;
}

export function getTicketActions(ticketId: number): Promise<Response> {
  return fetch(`/api/tickets/${ticketId}/actions`);
}

export function getActionAssignees(): Promise<Response> {
  return fetch("/api/staff/action-assignees");
}

export function createTicketAction(
  ticketId: number,
  idempotencyKey: string,
  payload: CreateActionPayload
): Promise<Response> {
  return fetch(`/api/staff/tickets/${ticketId}/actions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
}

export function updateTicketAction(
  ticketId: number,
  actionId: number,
  payload: UpdateActionPayload
): Promise<Response> {
  return fetch(`/api/staff/tickets/${ticketId}/actions/${actionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getTicketActionHistory(
  ticketId: number,
  actionId: number
): Promise<Response> {
  return fetch(`/api/tickets/${ticketId}/actions/${actionId}/history`);
}
