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
