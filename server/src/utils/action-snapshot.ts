import type { ActionTaken, Prisma } from "@prisma/client";

type SnapshotFields = Pick<
  ActionTaken,
  | "title"
  | "details"
  | "result"
  | "performedById"
  | "assigneeId"
  | "status"
  | "followUpRequired"
  | "followUpNote"
  | "attachmentNotes"
  | "version"
  | "createdAt"
  | "updatedAt"
  | "completedAt"
>;

export function actionSnapshot(action: SnapshotFields): Prisma.InputJsonObject {
  return {
    title: action.title,
    details: action.details,
    result: action.result,
    performedById: action.performedById,
    assigneeId: action.assigneeId,
    status: action.status,
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote,
    attachmentNotes: action.attachmentNotes,
    version: action.version,
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString(),
    completedAt: action.completedAt?.toISOString() ?? null,
  };
}
