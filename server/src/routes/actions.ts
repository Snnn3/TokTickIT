import { ActionStatus, Prisma, Role, TicketStatus } from "@prisma/client";
import { Router, Response } from "express";
import { createHash } from "node:crypto";
import {
  AuthenticatedRequest,
  requireAuth,
  requireRole,
} from "../middleware/auth";
import { prisma } from "../prisma";
import { parsePositiveIntParam } from "../utils/attachment";

const STAFF_ROLES = [Role.IT_STAFF, Role.ADMINISTRATOR] as const;
const ACTION_STATUSES = Object.values(ActionStatus);
const TERMINAL_TICKET_STATUSES = new Set<TicketStatus>([
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
  TicketStatus.CANCELLED,
]);
const TERMINAL_ACTION_STATUSES = new Set<ActionStatus>([
  ActionStatus.COMPLETED,
  ActionStatus.CANCELLED,
]);
const ACTION_TRANSITIONS: Record<ActionStatus, readonly ActionStatus[]> = {
  [ActionStatus.PLANNED]: [ActionStatus.IN_PROGRESS, ActionStatus.CANCELLED],
  [ActionStatus.IN_PROGRESS]: [ActionStatus.COMPLETED, ActionStatus.CANCELLED],
  [ActionStatus.COMPLETED]: [],
  [ActionStatus.CANCELLED]: [],
};

const USER_REF_SELECT = {
  id: true,
  name: true,
  role: true,
  isActive: true,
} as const;

const ACTION_INCLUDE = {
  performedBy: { select: USER_REF_SELECT },
  assignee: { select: USER_REF_SELECT },
} as const;

const EVENT_INCLUDE = {
  actor: { select: USER_REF_SELECT },
} as const;
const MAX_SERIALIZATION_RETRIES = 3;

type ActionWithUsers = Prisma.ActionTakenGetPayload<{
  include: typeof ACTION_INCLUDE;
}>;
type EventWithActor = Prisma.ActionEventGetPayload<{
  include: typeof EVENT_INCLUDE;
}>;

type ValidationField = { field: string; issue: string };

class ActionApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ActionApiError";
  }
}

function validationError(fields: ValidationField[]): ActionApiError {
  return new ActionApiError(400, "VALIDATION_ERROR", "Invalid request", {
    fields: Object.fromEntries(
      fields.map((field) => [field.field, field.issue])
    ),
  });
}

function sendError(res: Response, error: unknown): void {
  if (error instanceof ActionApiError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  res.status(500).json({
    error: { code: "UNEXPECTED", message: "Unexpected server error" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPresent(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function validateRecord(
  body: unknown,
  allowed: readonly string[]
): Record<string, unknown> {
  if (!isRecord(body)) {
    throw validationError([
      { field: "body", issue: "Request body must be an object" },
    ]);
  }

  const allowedSet = new Set(allowed);
  const unknown = Object.keys(body)
    .filter((key) => !allowedSet.has(key))
    .map((key) => ({ field: key, issue: "Unknown or read-only field" }));
  if (unknown.length > 0) throw validationError(unknown);
  return body;
}

function validateVersion(
  body: Record<string, unknown>,
  field: string,
  required = true
): number | undefined {
  if (!isPresent(body, field)) {
    if (required)
      throw validationError([{ field, issue: "Version is required" }]);
    return undefined;
  }
  const value = body[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw validationError([
      { field, issue: "Version must be an integer >= 1" },
    ]);
  }
  return value;
}

function validateRequiredText(
  body: Record<string, unknown>,
  field: string,
  maximum: number
): string {
  const value = body[field];
  if (typeof value !== "string") {
    throw validationError([{ field, issue: "Text is required" }]);
  }
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > maximum) {
    throw validationError([
      {
        field,
        issue: `Text must contain 1-${maximum} characters after trimming`,
      },
    ]);
  }
  return normalized;
}

function validateNullableText(
  body: Record<string, unknown>,
  field: string,
  maximum: number
): string | null | undefined {
  if (!isPresent(body, field)) return undefined;
  const value = body[field];
  if (value === null) return null;
  if (typeof value !== "string") {
    throw validationError([{ field, issue: "Value must be a string or null" }]);
  }
  const normalized = value.trim();
  if (normalized.length > maximum) {
    throw validationError([
      {
        field,
        issue: `Text must not exceed ${maximum} characters after trimming`,
      },
    ]);
  }
  return normalized || null;
}

function validateBoolean(
  body: Record<string, unknown>,
  field: string,
  defaultValue?: boolean
): boolean | undefined {
  if (!isPresent(body, field)) return defaultValue;
  if (typeof body[field] !== "boolean") {
    throw validationError([{ field, issue: "Value must be a boolean" }]);
  }
  return body[field] as boolean;
}

function validateNullableId(
  body: Record<string, unknown>,
  field: string
): number | null | undefined {
  if (!isPresent(body, field)) return undefined;
  const value = body[field];
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw validationError([
      { field, issue: "ID must be a positive integer or null" },
    ]);
  }
  return value;
}

function validateStatus(
  body: Record<string, unknown>
): ActionStatus | undefined {
  if (!isPresent(body, "status")) return undefined;
  if (
    typeof body.status !== "string" ||
    !ACTION_STATUSES.includes(body.status as ActionStatus)
  ) {
    throw validationError([
      {
        field: "status",
        issue: `Status must be one of ${ACTION_STATUSES.join(", ")}`,
      },
    ]);
  }
  return body.status as ActionStatus;
}

type CreatePayload = {
  title: string;
  details: string;
  assigneeId: number | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  expectedTicketVersion: number;
};

type EditPayload = {
  expectedVersion: number;
  expectedTicketVersion: number;
  title?: string;
  details?: string;
  result?: string | null;
  assigneeId?: number | null;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
  status?: ActionStatus;
};

function parseCreatePayload(body: unknown): CreatePayload {
  const record = validateRecord(body, [
    "title",
    "details",
    "assigneeId",
    "followUpRequired",
    "followUpNote",
    "attachmentNotes",
    "expectedTicketVersion",
  ]);
  const followUpRequired = validateBoolean(record, "followUpRequired", false)!;
  const payload: CreatePayload = {
    title: validateRequiredText(record, "title", 120),
    details: validateRequiredText(record, "details", 2000),
    assigneeId: null,
    followUpRequired,
    followUpNote: null,
    attachmentNotes: null,
    expectedTicketVersion: validateVersion(record, "expectedTicketVersion")!,
  };
  const assigneeId = validateNullableId(record, "assigneeId");
  const followUpNote = validateNullableText(record, "followUpNote", 2000);
  const attachmentNotes = validateNullableText(record, "attachmentNotes", 2000);
  payload.assigneeId = assigneeId ?? null;
  payload.followUpNote = followUpNote ?? null;
  payload.attachmentNotes = attachmentNotes ?? null;
  if (payload.followUpRequired && !payload.followUpNote) {
    throw new ActionApiError(
      400,
      "FOLLOW_UP_NOTE_REQUIRED",
      "A follow-up note is required when follow-up is enabled"
    );
  }
  return payload;
}

function parseEditPayload(body: unknown): EditPayload {
  const record = validateRecord(body, [
    "expectedVersion",
    "expectedTicketVersion",
    "title",
    "details",
    "result",
    "assigneeId",
    "followUpRequired",
    "followUpNote",
    "attachmentNotes",
    "status",
  ]);
  const editable = [
    "title",
    "details",
    "result",
    "assigneeId",
    "followUpRequired",
    "followUpNote",
    "attachmentNotes",
    "status",
  ];
  if (!editable.some((field) => isPresent(record, field))) {
    throw validationError([
      { field: "action", issue: "At least one editable field is required" },
    ]);
  }

  const payload: EditPayload = {
    expectedVersion: validateVersion(record, "expectedVersion")!,
    expectedTicketVersion: validateVersion(record, "expectedTicketVersion")!,
  };
  if (isPresent(record, "title")) {
    payload.title = validateRequiredText(record, "title", 120);
  }
  if (isPresent(record, "details")) {
    payload.details = validateRequiredText(record, "details", 2000);
  }
  if (isPresent(record, "result")) {
    payload.result = validateNullableText(record, "result", 2000);
  }
  const assigneeId = validateNullableId(record, "assigneeId");
  if (assigneeId !== undefined) payload.assigneeId = assigneeId;
  const followUpRequired = validateBoolean(record, "followUpRequired");
  if (followUpRequired !== undefined)
    payload.followUpRequired = followUpRequired;
  const followUpNote = validateNullableText(record, "followUpNote", 2000);
  if (followUpNote !== undefined) payload.followUpNote = followUpNote;
  const attachmentNotes = validateNullableText(record, "attachmentNotes", 2000);
  if (attachmentNotes !== undefined) payload.attachmentNotes = attachmentNotes;
  const status = validateStatus(record);
  if (status !== undefined) payload.status = status;
  return payload;
}

function userRef(user: {
  id: number;
  name: string;
  role: Role;
  isActive: boolean;
}) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
  };
}

function serializeAction(action: ActionWithUsers) {
  return {
    id: action.id,
    ticketId: action.ticketId,
    title: action.title,
    details: action.details,
    result: action.result,
    performedBy: userRef(action.performedBy),
    assignee: action.assignee ? userRef(action.assignee) : null,
    status: action.status,
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote,
    attachmentNotes: action.attachmentNotes,
    version: action.version,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
    completedAt: action.completedAt,
  };
}

function serializeEvent(event: EventWithActor) {
  return {
    id: event.id,
    actionId: event.actionId,
    actor: userRef(event.actor),
    type: event.type,
    previousVersion: event.previousVersion,
    newVersion: event.newVersion,
    occurredAt: event.occurredAt,
    before: event.before,
    after: event.after,
  };
}

function snapshot(action: {
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
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}) {
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
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
    completedAt: action.completedAt,
  };
}

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function validId(req: AuthenticatedRequest, field: string): number {
  const id = parsePositiveIntParam(req.params[field]);
  if (!id) {
    throw new ActionApiError(
      400,
      "INVALID_ID",
      `${field} must be a positive integer`
    );
  }
  return id;
}

function noQuery(req: AuthenticatedRequest): void {
  if (Object.keys(req.query).length > 0) {
    throw new ActionApiError(
      400,
      "INVALID_QUERY",
      "This endpoint does not accept query parameters"
    );
  }
}

function noReadInput(req: AuthenticatedRequest): void {
  const contentLength = Number(req.get("content-length") ?? 0);
  const hasFramedBody =
    contentLength > 0 || req.get("transfer-encoding") !== undefined;
  if (req.body !== undefined || hasFramedBody) {
    throw validationError([
      { field: "body", issue: "This endpoint does not accept a request body" },
    ]);
  }
  noQuery(req);
}

async function loadActionTicket(id: number) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, requesterId: true, status: true, version: true },
  });
  if (!ticket) throw new ActionApiError(404, "NOT_FOUND", "Ticket not found");
  return ticket;
}

async function loadReadableTicket(
  id: number,
  actor: NonNullable<AuthenticatedRequest["authUser"]>
) {
  const ticket = await loadActionTicket(id);
  if (actor.role === Role.REQUESTER && ticket.requesterId !== actor.id) {
    throw new ActionApiError(403, "FORBIDDEN", "Access denied");
  }
  return ticket;
}

async function loadStaffTicket(
  id: number,
  actor: NonNullable<AuthenticatedRequest["authUser"]>
) {
  const ticket = await loadActionTicket(id);
  if (ticket.requesterId === actor.id) {
    throw new ActionApiError(
      403,
      "SELF_SERVICE_FORBIDDEN",
      "Staff actions cannot be performed on your own ticket"
    );
  }
  return ticket;
}

function staleError(
  resource: "TICKET" | "ACTION_TAKEN",
  id: number,
  expectedVersion: number,
  currentVersion: number
): ActionApiError {
  return new ActionApiError(409, "STALE_WRITE", "The resource has changed", {
    resource,
    id,
    expectedVersion,
    currentVersion,
  });
}

function ticketInactive(status: TicketStatus): boolean {
  return TERMINAL_TICKET_STATUSES.has(status);
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

async function runSerializableTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < MAX_SERIALIZATION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        !isPrismaError(error, "P2034") ||
        attempt === MAX_SERIALIZATION_RETRIES - 1
      ) {
        throw error;
      }
    }
  }
  throw new Error("Serializable transaction retry loop exhausted");
}

async function checkAssignee(
  tx: Prisma.TransactionClient,
  assigneeId: number | null | undefined
): Promise<void> {
  if (assigneeId === undefined || assigneeId === null) return;
  const assignee = await tx.user.findFirst({
    where: { id: assigneeId, role: Role.IT_STAFF, isActive: true },
    select: { id: true },
  });
  if (!assignee) {
    throw new ActionApiError(
      422,
      "ASSIGNEE_NOT_ELIGIBLE",
      "Assignee must be an active IT Staff user"
    );
  }
}

async function incrementTicket(
  tx: Prisma.TransactionClient,
  ticketId: number,
  expectedVersion: number
): Promise<void> {
  const result = await tx.ticket.updateMany({
    where: { id: ticketId, version: expectedVersion },
    data: { version: { increment: 1 } },
  });
  if (result.count === 1) return;
  const current = await tx.ticket.findUnique({
    where: { id: ticketId },
    select: { version: true },
  });
  if (!current) throw new ActionApiError(404, "NOT_FOUND", "Ticket not found");
  throw staleError("TICKET", ticketId, expectedVersion, current.version);
}

type ActionCreationResponse = {
  action: ReturnType<typeof serializeAction>;
  ticketVersion: number;
};

type ActionCreationResult = {
  response: ActionCreationResponse;
};

function resolveCreationReplay(
  existing: {
    payloadFingerprint: string;
    response: Prisma.JsonValue;
  } | null,
  expectedFingerprint: string
): ActionCreationResult | null {
  if (!existing) return null;
  if (existing.payloadFingerprint !== expectedFingerprint) {
    throw new ActionApiError(
      409,
      "IDEMPOTENCY_CONFLICT",
      "The idempotency key was already used with a different payload"
    );
  }
  return { response: existing.response as unknown as ActionCreationResponse };
}

async function createAction(
  actor: NonNullable<AuthenticatedRequest["authUser"]>,
  ticketId: number,
  payload: CreatePayload,
  key: string
) {
  const canonicalPayload = { ticketId, ...payload };
  const payloadFingerprint = fingerprint(canonicalPayload);

  try {
    return await runSerializableTransaction(async (tx) => {
      const existing = await tx.actionCreationRequest.findUnique({
        where: { actorId_key: { actorId: actor.id, key } },
      });
      const replay = resolveCreationReplay(existing, payloadFingerprint);
      if (replay) return replay;

      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        select: { status: true, version: true },
      });
      if (!ticket)
        throw new ActionApiError(404, "NOT_FOUND", "Ticket not found");
      if (ticket.version !== payload.expectedTicketVersion) {
        throw staleError(
          "TICKET",
          ticketId,
          payload.expectedTicketVersion,
          ticket.version
        );
      }
      if (ticketInactive(ticket.status)) {
        throw new ActionApiError(
          409,
          "TICKET_NOT_ACTIVE",
          "Actions cannot be changed on an inactive ticket"
        );
      }
      await checkAssignee(tx, payload.assigneeId);
      await incrementTicket(tx, ticketId, payload.expectedTicketVersion);

      const now = new Date();
      const action = await tx.actionTaken.create({
        data: {
          ticketId,
          title: payload.title,
          details: payload.details,
          result: null,
          performedById: actor.id,
          assigneeId: payload.assigneeId ?? null,
          status: ActionStatus.PLANNED,
          followUpRequired: payload.followUpRequired,
          followUpNote: payload.followUpNote ?? null,
          attachmentNotes: payload.attachmentNotes ?? null,
          version: 1,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
        },
        include: ACTION_INCLUDE,
      });
      const after = snapshot(action);
      await tx.actionEvent.create({
        data: {
          actionId: action.id,
          actorId: actor.id,
          type: "CREATED",
          previousVersion: null,
          newVersion: 1,
          after: jsonSafe(after),
        },
      });
      const response = jsonSafe({
        action: serializeAction(action),
        ticketVersion: payload.expectedTicketVersion + 1,
      });
      await tx.actionCreationRequest.create({
        data: {
          actorId: actor.id,
          key,
          ticketId,
          actionId: action.id,
          payloadFingerprint,
          payload: jsonSafe(canonicalPayload),
          response,
        },
      });
      return { response };
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      const existing = await prisma.actionCreationRequest.findUnique({
        where: { actorId_key: { actorId: actor.id, key } },
      });
      const replay = resolveCreationReplay(existing, payloadFingerprint);
      if (replay) return replay;
    }
    throw error;
  }
}

async function editAction(
  actor: NonNullable<AuthenticatedRequest["authUser"]>,
  ticketId: number,
  actionId: number,
  payload: EditPayload
) {
  return runSerializableTransaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
      select: { requesterId: true, status: true, version: true },
    });
    if (!ticket) throw new ActionApiError(404, "NOT_FOUND", "Ticket not found");
    if (ticket.requesterId === actor.id) {
      throw new ActionApiError(
        403,
        "SELF_SERVICE_FORBIDDEN",
        "Staff actions cannot be performed on your own ticket"
      );
    }
    if (ticket.version !== payload.expectedTicketVersion) {
      throw staleError(
        "TICKET",
        ticketId,
        payload.expectedTicketVersion,
        ticket.version
      );
    }
    if (ticketInactive(ticket.status)) {
      throw new ActionApiError(
        409,
        "TICKET_NOT_ACTIVE",
        "Actions cannot be changed on an inactive ticket"
      );
    }

    const current = await tx.actionTaken.findFirst({
      where: { id: actionId, ticketId },
      include: ACTION_INCLUDE,
    });
    if (!current) {
      throw new ActionApiError(404, "NOT_FOUND", "Action not found");
    }
    if (current.version !== payload.expectedVersion) {
      throw staleError(
        "ACTION_TAKEN",
        actionId,
        payload.expectedVersion,
        current.version
      );
    }
    if (TERMINAL_ACTION_STATUSES.has(current.status)) {
      throw new ActionApiError(
        422,
        "INVALID_ACTION_TRANSITION",
        "A terminal action cannot be edited"
      );
    }

    const nextStatus = payload.status ?? current.status;
    if (
      nextStatus !== current.status &&
      !ACTION_TRANSITIONS[current.status].includes(nextStatus)
    ) {
      throw new ActionApiError(
        422,
        "INVALID_ACTION_TRANSITION",
        "The requested action status transition is not allowed"
      );
    }

    const nextAssigneeId =
      payload.assigneeId !== undefined
        ? payload.assigneeId
        : current.assigneeId;
    await checkAssignee(tx, payload.assigneeId);
    const nextFollowUpRequired =
      payload.followUpRequired ?? current.followUpRequired;
    const nextFollowUpNote =
      payload.followUpNote !== undefined
        ? payload.followUpNote
        : current.followUpNote;
    if (nextFollowUpRequired && !nextFollowUpNote) {
      throw new ActionApiError(
        400,
        "FOLLOW_UP_NOTE_REQUIRED",
        "A follow-up note is required when follow-up is enabled"
      );
    }
    const nextResult =
      payload.result !== undefined ? payload.result : current.result;
    if (nextStatus === ActionStatus.COMPLETED && !nextResult) {
      throw new ActionApiError(
        400,
        "ACTION_RESULT_REQUIRED",
        "A result is required when completing an action"
      );
    }

    const now = new Date();
    const nextCompletedAt = nextStatus === ActionStatus.COMPLETED ? now : null;
    await incrementTicket(tx, ticketId, payload.expectedTicketVersion);
    const updatedCount = await tx.actionTaken.updateMany({
      where: { id: actionId, version: payload.expectedVersion },
      data: {
        title: payload.title ?? current.title,
        details: payload.details ?? current.details,
        result: nextResult,
        assigneeId: nextAssigneeId,
        status: nextStatus,
        followUpRequired: nextFollowUpRequired,
        followUpNote: nextFollowUpNote,
        attachmentNotes:
          payload.attachmentNotes !== undefined
            ? payload.attachmentNotes
            : current.attachmentNotes,
        version: { increment: 1 },
        completedAt: nextCompletedAt,
        updatedAt: now,
      },
    });
    if (updatedCount.count !== 1) {
      const latest = await tx.actionTaken.findUnique({
        where: { id: actionId },
        select: { version: true },
      });
      if (!latest)
        throw new ActionApiError(404, "NOT_FOUND", "Action not found");
      throw staleError(
        "ACTION_TAKEN",
        actionId,
        payload.expectedVersion,
        latest.version
      );
    }

    const updated = await tx.actionTaken.findUnique({
      where: { id: actionId },
      include: ACTION_INCLUDE,
    });
    if (!updated)
      throw new ActionApiError(404, "NOT_FOUND", "Action not found");
    const type =
      current.assigneeId !== nextAssigneeId && nextAssigneeId === null
        ? "ASSIGNEE_RELEASED"
        : nextStatus !== current.status
          ? "STATUS_CHANGED"
          : "EDITED";
    await tx.actionEvent.create({
      data: {
        actionId,
        actorId: actor.id,
        type,
        previousVersion: current.version,
        newVersion: updated.version,
        before: jsonSafe(snapshot(current)),
        after: jsonSafe(snapshot(updated)),
      },
    });
    return {
      action: serializeAction(updated),
      ticketVersion: payload.expectedTicketVersion + 1,
    };
  });
}

export const actionRequesterRouter = Router();
export const actionStaffRouter = Router();

async function handleRequesterActionRead(
  req: AuthenticatedRequest,
  res: Response,
  kind: "list" | "detail" | "history"
): Promise<void> {
  try {
    noReadInput(req);
    const ticketId = validId(req, "id");
    const actionId = kind === "list" ? undefined : validId(req, "actionId");
    const ticket = await loadReadableTicket(ticketId, req.authUser!);

    if (kind === "list") {
      const actions = await prisma.actionTaken.findMany({
        where: { ticketId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: ACTION_INCLUDE,
      });
      res.status(200).json({
        actions: actions.map(serializeAction),
        ticketVersion: ticket.version,
      });
      return;
    }

    const action = await prisma.actionTaken.findFirst({
      where: { id: actionId!, ticketId },
      include: ACTION_INCLUDE,
    });
    if (!action) throw new ActionApiError(404, "NOT_FOUND", "Action not found");

    if (kind === "detail") {
      res.status(200).json({
        action: serializeAction(action),
        ticketVersion: ticket.version,
      });
      return;
    }

    const events = await prisma.actionEvent.findMany({
      where: { actionId: actionId! },
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
      include: EVENT_INCLUDE,
    });
    res.status(200).json({ events: events.map(serializeEvent) });
  } catch (error) {
    sendError(res, error);
  }
}

actionRequesterRouter.get(
  "/:id/actions",
  ...requireAuth,
  (req: AuthenticatedRequest, res: Response) =>
    void handleRequesterActionRead(req, res, "list")
);
actionRequesterRouter.get(
  "/:id/actions/:actionId",
  ...requireAuth,
  (req: AuthenticatedRequest, res: Response) =>
    void handleRequesterActionRead(req, res, "detail")
);
actionRequesterRouter.get(
  "/:id/actions/:actionId/history",
  ...requireAuth,
  (req: AuthenticatedRequest, res: Response) =>
    void handleRequesterActionRead(req, res, "history")
);

actionStaffRouter.get(
  "/action-assignees",
  ...requireAuth,
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      noReadInput(req);
      const assignees = await prisma.user.findMany({
        where: { role: Role.IT_STAFF, isActive: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: USER_REF_SELECT,
      });
      res.status(200).json({ assignees: assignees.map(userRef) });
    } catch (error) {
      sendError(res, error);
    }
  }
);

actionStaffRouter.post(
  "/tickets/:id/actions",
  ...requireAuth,
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ticketId = validId(req, "id");
      await loadStaffTicket(ticketId, req.authUser!);
      const key = req.header("Idempotency-Key")?.trim();
      if (
        !key ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          key
        )
      ) {
        throw validationError([
          {
            field: "Idempotency-Key",
            issue: "A UUID idempotency key is required",
          },
        ]);
      }
      const payload = parseCreatePayload(req.body);
      const result = await createAction(req.authUser!, ticketId, payload, key);
      res.status(201).json(result.response);
    } catch (error) {
      if (isPrismaError(error, "P2002")) {
        res.status(409).json({
          error: {
            code: "IDEMPOTENCY_CONFLICT",
            message: "The idempotency key was already used",
          },
        });
        return;
      }
      sendError(res, error);
    }
  }
);

actionStaffRouter.patch(
  "/tickets/:id/actions/:actionId",
  ...requireAuth,
  requireRole(...STAFF_ROLES),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ticketId = validId(req, "id");
      const actionId = validId(req, "actionId");
      await loadStaffTicket(ticketId, req.authUser!);
      const exists = await prisma.actionTaken.findFirst({
        where: { id: actionId, ticketId },
        select: { id: true },
      });
      if (!exists)
        throw new ActionApiError(404, "NOT_FOUND", "Action not found");
      const payload = parseEditPayload(req.body);
      const result = await editAction(
        req.authUser!,
        ticketId,
        actionId,
        payload
      );
      res.status(200).json(result);
    } catch (error) {
      sendError(res, error);
    }
  }
);
