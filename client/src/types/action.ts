import type { Role } from "./auth";

export type ActionStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export interface ActionUserRef {
  id: number;
  name: string;
  role: Role;
  isActive: boolean;
}

export interface ActionTaken {
  id: number;
  ticketId: number;
  title: string;
  details: string;
  result: string | null;
  performedBy: ActionUserRef;
  assignee: ActionUserRef | null;
  status: ActionStatus;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ActionSnapshot {
  title: string;
  details: string;
  result: string | null;
  performedById: number;
  assigneeId: number | null;
  status: ActionStatus;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type ActionEventType =
  | "CREATED"
  | "EDITED"
  | "STATUS_CHANGED"
  | "ASSIGNEE_RELEASED";

export interface ActionEvent {
  id: number;
  actionId: number;
  actor: ActionUserRef;
  type: ActionEventType;
  previousVersion: number | null;
  newVersion: number;
  occurredAt: string;
  before: ActionSnapshot | null;
  after: ActionSnapshot;
}

export interface ActionAssignee {
  id: number;
  name: string;
  role: "IT_STAFF";
  isActive: true;
}

export interface ActionListResponse {
  actions: ActionTaken[];
  ticketVersion: number;
}

export interface ActionWriteResponse {
  action: ActionTaken;
  ticketVersion: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

export function isActionStatus(value: unknown): value is ActionStatus {
  return (
    value === "PLANNED" ||
    value === "IN_PROGRESS" ||
    value === "COMPLETED" ||
    value === "CANCELLED"
  );
}

export function isActionUserRef(value: unknown): value is ActionUserRef {
  if (!isRecord(value)) return false;
  return (
    isPositiveInteger(value.id) &&
    typeof value.name === "string" &&
    (value.role === "REQUESTER" ||
      value.role === "IT_STAFF" ||
      value.role === "ADMINISTRATOR") &&
    typeof value.isActive === "boolean"
  );
}

export function isActionAssignee(value: unknown): value is ActionAssignee {
  return (
    isActionUserRef(value) &&
    value.role === "IT_STAFF" &&
    value.isActive === true
  );
}

export function isActionTaken(value: unknown): value is ActionTaken {
  if (!isRecord(value)) return false;
  return (
    isPositiveInteger(value.id) &&
    isPositiveInteger(value.ticketId) &&
    typeof value.title === "string" &&
    typeof value.details === "string" &&
    isNullableString(value.result) &&
    isActionUserRef(value.performedBy) &&
    (value.assignee === null || isActionUserRef(value.assignee)) &&
    isActionStatus(value.status) &&
    typeof value.followUpRequired === "boolean" &&
    isNullableString(value.followUpNote) &&
    isNullableString(value.attachmentNotes) &&
    isPositiveInteger(value.version) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    isNullableString(value.completedAt)
  );
}

export function isActionSnapshot(value: unknown): value is ActionSnapshot {
  if (!isRecord(value)) return false;
  return (
    typeof value.title === "string" &&
    typeof value.details === "string" &&
    isNullableString(value.result) &&
    isPositiveInteger(value.performedById) &&
    (value.assigneeId === null || isPositiveInteger(value.assigneeId)) &&
    isActionStatus(value.status) &&
    typeof value.followUpRequired === "boolean" &&
    isNullableString(value.followUpNote) &&
    isNullableString(value.attachmentNotes) &&
    isPositiveInteger(value.version) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    isNullableString(value.completedAt)
  );
}

export function isActionEvent(value: unknown): value is ActionEvent {
  if (!isRecord(value)) return false;
  return (
    isPositiveInteger(value.id) &&
    isPositiveInteger(value.actionId) &&
    isActionUserRef(value.actor) &&
    (value.type === "CREATED" ||
      value.type === "EDITED" ||
      value.type === "STATUS_CHANGED" ||
      value.type === "ASSIGNEE_RELEASED") &&
    (value.previousVersion === null ||
      isPositiveInteger(value.previousVersion)) &&
    isPositiveInteger(value.newVersion) &&
    typeof value.occurredAt === "string" &&
    (value.before === null || isActionSnapshot(value.before)) &&
    isActionSnapshot(value.after)
  );
}

export function parseActionListResponse(
  value: unknown
): ActionListResponse | null {
  if (!isRecord(value) || !Array.isArray(value.actions)) return null;
  const actions = value.actions.filter(isActionTaken);
  if (
    actions.length !== value.actions.length ||
    !isPositiveInteger(value.ticketVersion)
  ) {
    return null;
  }
  return { actions, ticketVersion: value.ticketVersion };
}

export function parseActionWriteResponse(
  value: unknown
): ActionWriteResponse | null {
  if (
    !isRecord(value) ||
    !isActionTaken(value.action) ||
    !isPositiveInteger(value.ticketVersion)
  ) {
    return null;
  }
  return { action: value.action, ticketVersion: value.ticketVersion };
}

export function parseActionAssignees(value: unknown): ActionAssignee[] | null {
  if (!isRecord(value) || !Array.isArray(value.assignees)) return null;
  const assignees = value.assignees.filter(isActionAssignee);
  return assignees.length === value.assignees.length ? assignees : null;
}

export function parseActionEvents(value: unknown): ActionEvent[] | null {
  if (!isRecord(value) || !Array.isArray(value.events)) return null;
  const events = value.events.filter(isActionEvent);
  return events.length === value.events.length ? events : null;
}
