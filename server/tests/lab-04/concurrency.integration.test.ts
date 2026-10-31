import { ActionStatus, PrismaClient, Role, TicketStatus } from "@prisma/client";
import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createDisposableDatabase } from "../helpers/disposable-database";
import {
  DASHBOARD_ACCOUNTS,
  resetDashboardTickets,
  seedDashboardAccounts,
} from "../helpers/dashboard-fixtures";
import { sessionCookie } from "../helpers/session";

let database: Awaited<ReturnType<typeof createDisposableDatabase>> | undefined;
let db: PrismaClient;
let app: Express;
let accounts: Awaited<ReturnType<typeof seedDashboardAccounts>>;

beforeAll(async () => {
  database = await createDisposableDatabase();
  process.env.DATABASE_URL = database.url;
  process.env.TOKTICKIT_DISPOSABLE_DATABASE_URL = database.url;
  process.env.JWT_SECRET = "isolated-concurrency-test-only";
  db = new PrismaClient({ datasourceUrl: database.url });
  accounts = await seedDashboardAccounts(db);
  vi.doMock("../../src/prisma", () => ({ prisma: db }));
  ({ app } = await import("../../src/app"));
}, 120000);

afterAll(async () => {
  try {
    if (db) await db.$disconnect();
  } finally {
    database?.dispose();
  }
});

async function createTicket(status: TicketStatus = TicketStatus.OPEN) {
  await resetDashboardTickets(db, false);
  return db.ticket.create({
    data: {
      number: `TKT-${randomUUID().slice(0, 16)}`,
      requesterId: accounts.requester.id,
      ownerId: accounts.staff.id,
      categoryId: (await db.category.findFirstOrThrow()).id,
      systemId: accounts.system.id,
      summary: "Concurrency regression ticket",
      description: "A disposable database write-race fixture.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      status,
      resolutionSummary:
        status === TicketStatus.RESOLVED ? "Previously resolved." : null,
      resolvedAt: status === TicketStatus.RESOLVED ? new Date() : null,
    },
  });
}

function cookie(account: keyof typeof DASHBOARD_ACCOUNTS) {
  const user = accounts[account];
  return sessionCookie({ id: user.id, role: user.role, tokenVersion: 0 });
}

async function raceTicketWrite(
  method: "patch" | "post",
  path: (id: number) => string,
  actor: keyof typeof DASHBOARD_ACCOUNTS,
  firstBody: object,
  secondBody: object,
  status: TicketStatus = TicketStatus.OPEN
) {
  const ticket = await createTicket(status);
  const send = (body: object) => {
    const endpoint =
      method === "patch"
        ? request(app).patch(path(ticket.id))
        : request(app).post(path(ticket.id));
    return endpoint.set("Cookie", cookie(actor)).send(body);
  };
  const responses = await Promise.all([send(firstBody), send(secondBody)]);
  expect(
    responses.map(({ status: code }) => code).sort(),
    JSON.stringify(responses.map(({ status, body }) => ({ status, body })))
  ).toEqual([200, 409]);
  expect(
    responses.find(({ status: code }) => code === 409)?.body.error.code
  ).toBe("STALE_WRITE");
  const current = await db.ticket.findUniqueOrThrow({
    where: { id: ticket.id },
  });
  expect(current.version).toBe(2);
  expect(await db.actionEvent.count()).toBe(0);
  return {
    ticket,
    current,
    winner: responses.find(({ status: code }) => code === 200)!,
  };
}

describe("Lab 4 real-database concurrent writes", () => {
  it("allows only one concurrent owner update", async () => {
    const { ticket, current } = await raceTicketWrite(
      "patch",
      (id) => `/api/staff/tickets/${id}/owner`,
      "staff",
      { ownerId: accounts.staff.id, expectedVersion: 1 },
      { ownerId: accounts.secondStaff.id, expectedVersion: 1 }
    );
    expect([accounts.staff.id, accounts.secondStaff.id]).toContain(
      current.ownerId
    );
    expect(current.status).toBe(TicketStatus.OPEN);
    expect(current.itPriority).toBe("MEDIUM");
    expect(await db.ticket.count({ where: { id: ticket.id } })).toBe(1);
  });

  it("allows only one concurrent priority update", async () => {
    const { current } = await raceTicketWrite(
      "patch",
      (id) => `/api/staff/tickets/${id}/priority`,
      "staff",
      { itPriority: "HIGH", expectedVersion: 1 },
      { itPriority: "LOW", expectedVersion: 1 }
    );
    expect(["HIGH", "LOW"]).toContain(current.itPriority);
  });

  it("allows only one concurrent status update", async () => {
    const { current } = await raceTicketWrite(
      "patch",
      (id) => `/api/staff/tickets/${id}/status`,
      "staff",
      { status: "IN_PROGRESS", expectedVersion: 1 },
      { status: "WAITING_FOR_REQUESTER", expectedVersion: 1 }
    );
    expect(["IN_PROGRESS", "WAITING_FOR_REQUESTER"]).toContain(current.status);
  });

  it("allows only one concurrent requester appears-resolved signal", async () => {
    const { current } = await raceTicketWrite(
      "post",
      (id) => `/api/tickets/${id}/appears-resolved`,
      "requester",
      { expectedVersion: 1 },
      { expectedVersion: 1 }
    );
    expect(current.status).toBe(TicketStatus.OPEN);
    expect(current.appearsResolvedAt).toBeInstanceOf(Date);
  });

  it("allows only one concurrent requester reopen", async () => {
    const { current } = await raceTicketWrite(
      "post",
      (id) => `/api/tickets/${id}/reopen`,
      "requester",
      { expectedVersion: 1 },
      { expectedVersion: 1 },
      TicketStatus.RESOLVED
    );
    expect(current.status).toBe(TicketStatus.REOPENED);
    expect(current.resolutionSummary).toBeNull();
    expect(current.resolvedAt).toBeNull();
  });

  it("serializes concurrent Action Taken edits without partial history", async () => {
    const ticket = await createTicket();
    const action = await db.actionTaken.create({
      data: {
        ticketId: ticket.id,
        title: "Initial action",
        details: "Inspect the network path.",
        performedById: accounts.staff.id,
        status: ActionStatus.PLANNED,
      },
    });
    const edit = (title: string) =>
      request(app)
        .patch(`/api/staff/tickets/${ticket.id}/actions/${action.id}`)
        .set("Cookie", cookie("staff"))
        .send({ title, expectedVersion: 1, expectedTicketVersion: 1 });
    const responses = await Promise.all([edit("Winner A"), edit("Winner B")]);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    expect(
      responses.find(({ status }) => status === 409)?.body.error.code
    ).toBe("STALE_WRITE");
    const [updatedAction, updatedTicket, events] = await Promise.all([
      db.actionTaken.findUniqueOrThrow({ where: { id: action.id } }),
      db.ticket.findUniqueOrThrow({ where: { id: ticket.id } }),
      db.actionEvent.findMany({ where: { actionId: action.id } }),
    ]);
    expect(["Winner A", "Winner B"]).toContain(updatedAction.title);
    expect(updatedAction.version).toBe(2);
    expect(updatedTicket.version).toBe(2);
    expect(events).toHaveLength(1);
    expect(events[0].newVersion).toBe(2);
  });

  it("replays one committed Action create after concurrent and lost-response retries", async () => {
    const ticket = await createTicket();
    const key = randomUUID();
    const body = {
      title: "Replay-safe action",
      details: "Confirm the connection.",
      expectedTicketVersion: 1,
    };
    const create = () =>
      request(app)
        .post(`/api/staff/tickets/${ticket.id}/actions`)
        .set("Cookie", cookie("staff"))
        .set("Idempotency-Key", key)
        .send(body);
    const [first, concurrent] = await Promise.all([create(), create()]);
    expect(first.status).toBe(201);
    expect(concurrent.status).toBe(201);
    expect(concurrent.body).toEqual(first.body);
    const replay = await create();
    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(first.body);
    const conflict = await request(app)
      .post(`/api/staff/tickets/${ticket.id}/actions`)
      .set("Cookie", cookie("staff"))
      .set("Idempotency-Key", key)
      .send({ ...body, title: "Changed payload" });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
    const actionId = first.body.action.id as number;
    const [actions, events, requests, currentTicket] = await Promise.all([
      db.actionTaken.count({ where: { ticketId: ticket.id } }),
      db.actionEvent.count({ where: { actionId } }),
      db.actionCreationRequest.count({ where: { ticketId: ticket.id } }),
      db.ticket.findUniqueOrThrow({ where: { id: ticket.id } }),
    ]);
    expect({ actions, events, requests }).toEqual({
      actions: 1,
      events: 1,
      requests: 1,
    });
    expect(currentTicket.version).toBe(2);
  });

  it("keeps assignment and Admin deactivation cascade atomic under a race", async () => {
    const ticket = await createTicket();
    const action = await db.actionTaken.create({
      data: {
        ticketId: ticket.id,
        title: "Race-safe assignment",
        details: "Assign only to active Staff.",
        performedById: accounts.staff.id,
        status: ActionStatus.PLANNED,
      },
    });
    const [deactivation, assignment] = await Promise.all([
      request(app)
        .patch(`/api/admin/users/${accounts.secondStaff.id}`)
        .set("Cookie", cookie("admin"))
        .send({ isActive: false }),
      request(app)
        .patch(`/api/staff/tickets/${ticket.id}/actions/${action.id}`)
        .set("Cookie", cookie("staff"))
        .send({
          assigneeId: accounts.secondStaff.id,
          expectedVersion: 1,
          expectedTicketVersion: 1,
        }),
    ]);
    expect(deactivation.status).toBe(200);
    expect(deactivation.body.user.isActive).toBe(false);
    const [inactiveUser, currentAction, currentTicket, events] =
      await Promise.all([
        db.user.findUniqueOrThrow({ where: { id: accounts.secondStaff.id } }),
        db.actionTaken.findUniqueOrThrow({ where: { id: action.id } }),
        db.ticket.findUniqueOrThrow({ where: { id: ticket.id } }),
        db.actionEvent.findMany({ where: { actionId: action.id } }),
      ]);
    expect(inactiveUser.isActive).toBe(false);
    expect(currentAction.assigneeId).toBeNull();
    if (assignment.status === 422) {
      expect(assignment.body.error.code).toBe("ASSIGNEE_NOT_ELIGIBLE");
      expect(currentAction.version).toBe(1);
      expect(currentTicket.version).toBe(1);
      expect(events).toHaveLength(0);
    } else {
      expect(assignment.status).toBe(200);
      expect(deactivation.body.unassignedActionCount).toBe(1);
      expect(currentAction.version).toBe(3);
      expect(currentTicket.version).toBe(3);
      expect(events.map(({ type }) => type)).toEqual([
        "EDITED",
        "ASSIGNEE_RELEASED",
      ]);
    }
  });
});
