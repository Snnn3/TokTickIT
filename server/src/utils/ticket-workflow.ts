import {
  ActionStatus,
  Role,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  isSerializationConflict,
  runSerializableTransaction,
} from "./serializable-transaction";
import { lockActionAssignmentRows } from "./action-assignment-lock";
import { prisma } from "../prisma";
import { isTicketStatus } from "./ticketStatus";
import { isTransitionAllowed } from "./transitions";

export type StatusChange = {
  status: TicketStatus;
  expectedVersion: number;
  resolutionSummary?: string | null;
};

export type OwnerChange = { ownerId: number | null; expectedVersion: number };
export type PriorityChange = {
  itPriority: TicketPriority;
  expectedVersion: number;
};

export class TicketWorkflowError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "TicketWorkflowError";
  }
}

function validationError(fields: Record<string, string>): TicketWorkflowError {
  return new TicketWorkflowError(400, "VALIDATION_ERROR", "Invalid request", {
    fields,
  });
}

function requestRecord(
  body: unknown,
  allowed: readonly string[]
): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw validationError({ body: "Request body must be an object" });
  }
  const record = body as Record<string, unknown>;
  const unknown = Object.keys(record).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw validationError(
      Object.fromEntries(
        unknown.map((key) => [key, "Unknown or read-only field"])
      )
    );
  }
  return record;
}

function expectedVersion(record: Record<string, unknown>): number {
  const value = record.expectedVersion;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw validationError({
      expectedVersion: "Version must be an integer >= 1",
    });
  }
  return value;
}

export function parseStatusChange(body: unknown): StatusChange {
  const record = requestRecord(body, [
    "status",
    "resolutionSummary",
    "expectedVersion",
  ]);
  if (typeof record.status !== "string" || !isTicketStatus(record.status)) {
    throw validationError({ status: "Status must be a valid Ticket status" });
  }

  let resolutionSummary: string | null | undefined;
  if (Object.prototype.hasOwnProperty.call(record, "resolutionSummary")) {
    const raw = record.resolutionSummary;
    if (raw !== null && typeof raw !== "string") {
      throw validationError({
        resolutionSummary: "Value must be a string or null",
      });
    }
    if (typeof raw === "string" && raw.trim().length > 2000) {
      throw validationError({
        resolutionSummary: "Text must contain no more than 2000 characters",
      });
    }
    resolutionSummary = typeof raw === "string" ? raw.trim() : raw;
  }

  return {
    status: record.status,
    expectedVersion: expectedVersion(record),
    ...(resolutionSummary !== undefined ? { resolutionSummary } : {}),
  };
}

function parseExpectedVersion(body: unknown): number {
  const record = requestRecord(body, ["expectedVersion"]);
  return expectedVersion(record);
}

export function parseOwnerChange(body: unknown): OwnerChange {
  const record = requestRecord(body, ["ownerId", "expectedVersion"]);
  if (!Object.prototype.hasOwnProperty.call(record, "ownerId")) {
    throw validationError({ ownerId: "Owner is required" });
  }
  const ownerId = record.ownerId;
  if (
    ownerId !== null &&
    (typeof ownerId !== "number" || !Number.isInteger(ownerId) || ownerId < 1)
  ) {
    throw validationError({
      ownerId: "Owner must be a positive user id or null",
    });
  }
  return { ownerId, expectedVersion: expectedVersion(record) };
}

export function parsePriorityChange(body: unknown): PriorityChange {
  const record = requestRecord(body, ["itPriority", "expectedVersion"]);
  if (
    typeof record.itPriority !== "string" ||
    !Object.values(TicketPriority).includes(record.itPriority as TicketPriority)
  ) {
    throw validationError({
      itPriority: "IT priority must be LOW, MEDIUM, or HIGH",
    });
  }
  return {
    itPriority: record.itPriority as TicketPriority,
    expectedVersion: expectedVersion(record),
  };
}

function notFound(): TicketWorkflowError {
  return new TicketWorkflowError(404, "NOT_FOUND", "Ticket not found");
}

function staleWrite(
  ticketId: number,
  expected: number,
  current: number
): TicketWorkflowError {
  return new TicketWorkflowError(409, "STALE_WRITE", "The Ticket has changed", {
    resource: "TICKET",
    id: ticketId,
    expectedVersion: expected,
    currentVersion: current,
  });
}

function assertStaffCanManageTicket(
  requesterId: number,
  actorId: number
): void {
  if (requesterId === actorId) {
    throw new TicketWorkflowError(
      403,
      "SELF_SERVICE_FORBIDDEN",
      "Staff workflow changes are not allowed on your own Ticket"
    );
  }
}

function assertExpectedTicketVersion(
  ticketId: number,
  currentVersion: number,
  expectedVersion: number
): void {
  if (currentVersion !== expectedVersion) {
    throw staleWrite(ticketId, expectedVersion, currentVersion);
  }
}

function assertRequesterOwnsTicket(
  currentRequesterId: number,
  requesterId: number
): void {
  if (currentRequesterId !== requesterId) {
    throw new TicketWorkflowError(403, "FORBIDDEN", "Access denied");
  }
}

async function assertStaffTicketCanBeChanged(
  tx: Prisma.TransactionClient,
  ticketId: number,
  actorId: number
): Promise<void> {
  const current = await tx.ticket.findUnique({
    where: { id: ticketId },
    select: { requesterId: true },
  });
  if (!current) throw notFound();
  assertStaffCanManageTicket(current.requesterId, actorId);
}

function invalidTransition(from: TicketStatus, to: TicketStatus) {
  return new TicketWorkflowError(
    422,
    "INVALID_TRANSITION",
    from === TicketStatus.CLOSED || from === TicketStatus.CANCELLED
      ? `Cannot transition out of terminal status ${from}`
      : `Cannot transition from ${from} to ${to}`
  );
}

async function runVersionedWrite<T>(
  ticketId: number,
  version: () => number | undefined,
  work: () => Promise<T>
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (!isSerializationConflict(error)) throw error;
    const expected = version();
    const current = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { version: true },
    });
    if (!current) throw notFound();
    if (expected !== undefined && current.version !== expected) {
      throw staleWrite(ticketId, expected, current.version);
    }
    throw error;
  }
}

async function writeTicket(
  tx: Prisma.TransactionClient,
  ticketId: number,
  expected: number,
  data: Prisma.TicketUncheckedUpdateManyInput,
  conditions: Prisma.TicketWhereInput = {}
): Promise<void> {
  const result = await tx.ticket.updateMany({
    where: { id: ticketId, version: expected, ...conditions },
    data,
  });
  if (result.count === 1) return;

  const current = await tx.ticket.findUnique({
    where: { id: ticketId },
    select: { version: true },
  });
  if (!current) throw notFound();
  throw staleWrite(ticketId, expected, current.version);
}

export async function changeStaffTicketStatus(
  ticketId: number,
  actorId: number,
  body: unknown
) {
  let expectedVersion: number | undefined;
  return runVersionedWrite(
    ticketId,
    () => expectedVersion,
    () =>
      runSerializableTransaction(async (tx) => {
        // The same parent-row lock serializes Ticket workflow changes with
        // Action writes, so the resolution prerequisite cannot race a completion.
        await lockActionAssignmentRows(tx, [], [ticketId]);
        const current = await tx.ticket.findUnique({
          where: { id: ticketId },
          select: {
            id: true,
            requesterId: true,
            status: true,
            version: true,
            resolutionSummary: true,
            appearsResolvedAt: true,
            resolvedAt: true,
          },
        });
        if (!current) throw notFound();
        assertStaffCanManageTicket(current.requesterId, actorId);
        const change = parseStatusChange(body);
        expectedVersion = change.expectedVersion;
        assertExpectedTicketVersion(
          ticketId,
          current.version,
          change.expectedVersion
        );
        if (!isTransitionAllowed(current.status, change.status)) {
          throw invalidTransition(current.status, change.status);
        }

        let resolutionSummary = current.resolutionSummary;
        if (change.status === TicketStatus.RESOLVED) {
          const completedActions = await tx.actionTaken.findMany({
            where: { ticketId, status: ActionStatus.COMPLETED },
            select: { result: true },
          });
          if (!completedActions.some((action) => action.result?.trim())) {
            throw new TicketWorkflowError(
              400,
              "ACTION_RESULT_REQUIRED",
              "A completed Action with a meaningful result is required to resolve this Ticket"
            );
          }

          if (
            Object.prototype.hasOwnProperty.call(change, "resolutionSummary")
          ) {
            const supplied = change.resolutionSummary;
            if (typeof supplied !== "string" || supplied.length === 0) {
              throw new TicketWorkflowError(
                400,
                "RESOLUTION_SUMMARY_REQUIRED",
                "A resolution summary is required to resolve this Ticket"
              );
            }
            resolutionSummary = supplied;
          } else {
            const stored = current.resolutionSummary?.trim() ?? "";
            if (!stored || stored.length > 2000) {
              throw new TicketWorkflowError(
                400,
                "RESOLUTION_SUMMARY_REQUIRED",
                "A resolution summary is required to resolve this Ticket"
              );
            }
            resolutionSummary = stored;
          }
        }

        if (change.status === TicketStatus.REOPENED) {
          resolutionSummary = null;
        }

        const now = new Date();
        const resolvedAt =
          change.status === TicketStatus.RESOLVED
            ? now
            : change.status === TicketStatus.REOPENED
              ? null
              : current.resolvedAt;
        await writeTicket(tx, ticketId, change.expectedVersion, {
          status: change.status,
          resolutionSummary,
          appearsResolvedAt: null,
          resolvedAt,
          updatedAt: now,
          version: { increment: 1 },
        });

        return {
          status: change.status,
          resolutionSummary,
          appearsResolvedAt: null,
          resolvedAt,
          version: change.expectedVersion + 1,
        };
      })
  );
}

export async function assignStaffTicketOwner(
  ticketId: number,
  actorId: number,
  body: unknown
) {
  let expectedVersion: number | undefined;
  return runVersionedWrite(
    ticketId,
    () => expectedVersion,
    () =>
      runSerializableTransaction(async (tx) => {
        await assertStaffTicketCanBeChanged(tx, ticketId, actorId);
        const change = parseOwnerChange(body);
        expectedVersion = change.expectedVersion;
        await lockActionAssignmentRows(tx, [change.ownerId], [ticketId]);
        const current = await tx.ticket.findUnique({
          where: { id: ticketId },
          select: {
            id: true,
            requesterId: true,
            ownerId: true,
            status: true,
            version: true,
          },
        });
        if (!current) throw notFound();
        assertStaffCanManageTicket(current.requesterId, actorId);
        assertExpectedTicketVersion(
          ticketId,
          current.version,
          change.expectedVersion
        );

        let owner: {
          id: number;
          name: string;
          role: Role;
          isActive: boolean;
        } | null = null;
        if (change.ownerId !== null) {
          const target = await tx.user.findUnique({
            where: { id: change.ownerId },
            select: { id: true, name: true, role: true, isActive: true },
          });
          if (
            !target ||
            !target.isActive ||
            (target.role !== Role.IT_STAFF &&
              target.role !== Role.ADMINISTRATOR)
          ) {
            throw new TicketWorkflowError(
              422,
              "INVALID_OWNER",
              "Owner must be an active IT Staff or Administrator user"
            );
          }
          owner = {
            id: target.id,
            name: target.name,
            role: target.role,
            isActive: target.isActive,
          };
        }

        const shouldAutoOpen =
          change.ownerId === actorId &&
          current.ownerId === null &&
          current.status === TicketStatus.NEW;
        const status = shouldAutoOpen ? TicketStatus.OPEN : current.status;
        await writeTicket(
          tx,
          ticketId,
          change.expectedVersion,
          {
            ownerId: change.ownerId,
            ...(shouldAutoOpen ? { status: TicketStatus.OPEN } : {}),
            updatedAt: new Date(),
            version: { increment: 1 },
          },
          {
            requesterId: { not: actorId },
            ownerId: current.ownerId,
            status: current.status,
          }
        );
        return { owner, status, version: change.expectedVersion + 1 };
      })
  );
}

export async function changeStaffTicketPriority(
  ticketId: number,
  actorId: number,
  body: unknown
) {
  let expectedVersion: number | undefined;
  return runVersionedWrite(
    ticketId,
    () => expectedVersion,
    () =>
      runSerializableTransaction(async (tx) => {
        await assertStaffTicketCanBeChanged(tx, ticketId, actorId);
        const change = parsePriorityChange(body);
        expectedVersion = change.expectedVersion;
        await lockActionAssignmentRows(tx, [], [ticketId]);
        const current = await tx.ticket.findUnique({
          where: { id: ticketId },
          select: { id: true, requesterId: true, version: true },
        });
        if (!current) throw notFound();
        assertStaffCanManageTicket(current.requesterId, actorId);
        assertExpectedTicketVersion(
          ticketId,
          current.version,
          change.expectedVersion
        );

        await writeTicket(
          tx,
          ticketId,
          change.expectedVersion,
          {
            itPriority: change.itPriority,
            updatedAt: new Date(),
            version: { increment: 1 },
          },
          { requesterId: { not: actorId } }
        );
        return {
          itPriority: change.itPriority,
          version: change.expectedVersion + 1,
        };
      })
  );
}

export async function markTicketAppearsResolved(
  ticketId: number,
  requesterId: number,
  body: unknown
) {
  let expectedVersion: number | undefined;
  return runVersionedWrite(
    ticketId,
    () => expectedVersion,
    () =>
      runSerializableTransaction(async (tx) => {
        await lockActionAssignmentRows(tx, [], [ticketId]);
        const current = await tx.ticket.findUnique({
          where: { id: ticketId },
          select: {
            id: true,
            requesterId: true,
            status: true,
            version: true,
            appearsResolvedAt: true,
          },
        });
        if (!current) throw notFound();
        assertRequesterOwnsTicket(current.requesterId, requesterId);
        const version = parseExpectedVersion(body);
        expectedVersion = version;
        assertExpectedTicketVersion(ticketId, current.version, version);
        if (
          current.status === TicketStatus.CLOSED ||
          current.status === TicketStatus.CANCELLED
        ) {
          throw new TicketWorkflowError(
            422,
            "INVALID_TRANSITION",
            "A Closed or Cancelled ticket cannot be marked as appears resolved"
          );
        }
        if (current.appearsResolvedAt !== null) {
          throw new TicketWorkflowError(
            409,
            "ALREADY_SIGNALLED",
            "This Ticket is already marked as appears resolved"
          );
        }

        const signalledAt = new Date();
        await writeTicket(
          tx,
          ticketId,
          version,
          {
            appearsResolvedAt: signalledAt,
            updatedAt: signalledAt,
            version: { increment: 1 },
          },
          {
            requesterId,
            status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] },
            appearsResolvedAt: null,
          }
        );
        return { appearsResolvedAt: signalledAt, version: version + 1 };
      })
  );
}

export async function reopenRequesterTicket(
  ticketId: number,
  requesterId: number,
  body: unknown
) {
  let expectedVersion: number | undefined;
  return runVersionedWrite(
    ticketId,
    () => expectedVersion,
    () =>
      runSerializableTransaction(async (tx) => {
        await lockActionAssignmentRows(tx, [], [ticketId]);
        const current = await tx.ticket.findUnique({
          where: { id: ticketId },
          select: {
            id: true,
            requesterId: true,
            status: true,
            version: true,
          },
        });
        if (!current) throw notFound();
        assertRequesterOwnsTicket(current.requesterId, requesterId);
        const version = parseExpectedVersion(body);
        expectedVersion = version;
        assertExpectedTicketVersion(ticketId, current.version, version);
        if (current.status !== TicketStatus.RESOLVED) {
          throw new TicketWorkflowError(
            422,
            "INVALID_TRANSITION",
            "Only a Resolved Ticket can be reopened"
          );
        }

        const now = new Date();
        await writeTicket(
          tx,
          ticketId,
          version,
          {
            status: TicketStatus.REOPENED,
            appearsResolvedAt: null,
            resolutionSummary: null,
            resolvedAt: null,
            updatedAt: now,
            version: { increment: 1 },
          },
          { requesterId, status: TicketStatus.RESOLVED }
        );
        return {
          status: TicketStatus.REOPENED,
          resolutionSummary: null,
          appearsResolvedAt: null,
          resolvedAt: null,
          version: version + 1,
        };
      })
  );
}

export function sendTicketWorkflowError(
  res: {
    status: (code: number) => { json: (body: unknown) => unknown };
  },
  error: unknown
): boolean {
  if (!(error instanceof TicketWorkflowError)) return false;
  res.status(error.statusCode).json({
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
  return true;
}
