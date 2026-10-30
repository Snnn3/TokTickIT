import { Role, TicketStatus } from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";
import { sessionCookie, sessionUser } from "../helpers/session";

const workflowEdges = [
  ["NEW", "OPEN"],
  ["NEW", "CANCELLED"],
  ["OPEN", "IN_PROGRESS"],
  ["OPEN", "WAITING_FOR_REQUESTER"],
  ["OPEN", "CANCELLED"],
  ["IN_PROGRESS", "WAITING_FOR_REQUESTER"],
  ["IN_PROGRESS", "RESOLVED"],
  ["IN_PROGRESS", "CANCELLED"],
  ["WAITING_FOR_REQUESTER", "IN_PROGRESS"],
  ["WAITING_FOR_REQUESTER", "RESOLVED"],
  ["WAITING_FOR_REQUESTER", "CANCELLED"],
  ["RESOLVED", "CLOSED"],
  ["RESOLVED", "REOPENED"],
  ["REOPENED", "IN_PROGRESS"],
  ["REOPENED", "WAITING_FOR_REQUESTER"],
  ["REOPENED", "CANCELLED"],
] as const;

const forbiddenWorkflowEdges = Object.values(TicketStatus).flatMap((from) =>
  Object.values(TicketStatus)
    .filter(
      (to) =>
        !workflowEdges.some(
          ([allowedFrom, allowedTo]) => allowedFrom === from && allowedTo === to
        )
    )
    .map((to) => [from, to] as const)
);

const actor = { id: 9, role: Role.IT_STAFF };

function authAs(id = actor.id, role: Role = actor.role) {
  vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
    sessionUser({ id, role, mustChangePassword: false })
  );
  return sessionCookie({ id, role });
}

function workflowTransaction(
  initial: Record<string, unknown>,
  completedResults: Array<{ result: string | null }> = []
) {
  const ticket = { ...initial };
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    ticket: {
      findUnique: vi.fn().mockImplementation(async () => ({ ...ticket })),
      updateMany: vi
        .fn()
        .mockImplementation(
          async (args: {
            where: { version: number };
            data: Record<string, unknown>;
          }) => {
            if (ticket.version !== args.where.version) return { count: 0 };
            for (const [key, value] of Object.entries(args.data)) {
              if (key === "version" && typeof value === "object" && value) {
                ticket.version = Number(ticket.version) + 1;
              } else {
                ticket[key] = value;
              }
            }
            return { count: 1 };
          }
        ),
    },
    actionTaken: {
      findMany: vi.fn().mockResolvedValue(completedResults),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 10,
        name: "Assigned Staff",
        role: Role.IT_STAFF,
        isActive: true,
      }),
    },
  };
  vi.spyOn(prisma, "$transaction").mockImplementation((async (
    callback: (transaction: object) => Promise<unknown>
  ) => callback(tx)) as never);
  return { tx, ticket };
}

function ticket(overrides: Record<string, unknown> = {}) {
  return {
    id: 20,
    requesterId: 2,
    status: "OPEN",
    version: 4,
    resolutionSummary: null,
    appearsResolvedAt: null,
    resolvedAt: null,
    ...overrides,
  };
}

beforeEach(() => vi.restoreAllMocks());

describe("Lab 4 versioned Ticket workflow API", () => {
  it("versions owner assignment and preserves the NEW auto-open rule", async () => {
    const cookie = authAs(10, Role.IT_STAFF);
    const { tx } = workflowTransaction(
      ticket({ status: "NEW", ownerId: null })
    );

    const response = await request(app)
      .patch("/api/staff/tickets/20/owner")
      .set("Cookie", cookie)
      .send({ ownerId: 10, expectedVersion: 4 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      owner: {
        id: 10,
        name: "Assigned Staff",
        role: Role.IT_STAFF,
        isActive: true,
      },
      status: "OPEN",
      version: 5,
    });
    expect(tx.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 20, version: 4 }),
        data: expect.objectContaining({
          ownerId: 10,
          status: "OPEN",
          version: { increment: 1 },
        }),
      })
    );
  });

  it("does not auto-open an unassigned NEW Ticket when ownerId is null", async () => {
    const cookie = authAs();
    const { tx } = workflowTransaction(
      ticket({ status: "NEW", ownerId: null })
    );

    const response = await request(app)
      .patch("/api/staff/tickets/20/owner")
      .set("Cookie", cookie)
      .send({ ownerId: null, expectedVersion: 4 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ owner: null, status: "NEW", version: 5 });
    expect(tx.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ status: "OPEN" }),
      })
    );
  });

  it("does not auto-open an unowned NEW Ticket assigned to another Staff member", async () => {
    const cookie = authAs();
    const { tx } = workflowTransaction(
      ticket({ status: "NEW", ownerId: null })
    );

    const response = await request(app)
      .patch("/api/staff/tickets/20/owner")
      .set("Cookie", cookie)
      .send({ ownerId: 10, expectedVersion: 4 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      owner: { id: 10 },
      status: "NEW",
      version: 5,
    });
    expect(tx.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ status: "OPEN" }),
      })
    );
  });

  it("versions priority changes and rejects stale owner writes without assignment lookup", async () => {
    const cookie = authAs();
    const { tx: priorityTx } = workflowTransaction(ticket());
    const priority = await request(app)
      .patch("/api/staff/tickets/20/priority")
      .set("Cookie", cookie)
      .send({ itPriority: "HIGH", expectedVersion: 4 });

    expect(priority.status).toBe(200);
    expect(priority.body).toEqual({ itPriority: "HIGH", version: 5 });
    expect(priorityTx.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 20, version: 4 }),
        data: expect.objectContaining({
          itPriority: "HIGH",
          version: { increment: 1 },
        }),
      })
    );

    const { tx: staleTx } = workflowTransaction(ticket({ version: 5 }));
    const stale = await request(app)
      .patch("/api/staff/tickets/20/owner")
      .set("Cookie", cookie)
      .send({ ownerId: 10, expectedVersion: 4 });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("STALE_WRITE");
    expect(staleTx.user.findUnique).not.toHaveBeenCalled();
    expect(staleTx.ticket.updateMany).not.toHaveBeenCalled();
  });

  it.each(workflowEdges)(
    "enforces the %s -> %s transition",
    async (from, to) => {
      const cookie = authAs();
      const { tx } = workflowTransaction(
        ticket({ status: from, resolutionSummary: "Existing summary." }),
        [{ result: "Verified the fix." }]
      );

      const response = await request(app)
        .patch("/api/staff/tickets/20/status")
        .set("Cookie", cookie)
        .send({ status: to, expectedVersion: 4 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: to, version: 5 });
      expect(tx.ticket.updateMany).toHaveBeenCalledTimes(1);
    }
  );

  it.each(forbiddenWorkflowEdges)(
    "rejects forbidden or same-status transition %s -> %s without a write",
    async (from, to) => {
      const cookie = authAs();
      const { tx } = workflowTransaction(
        ticket({ status: from, resolutionSummary: "Existing summary." }),
        [{ result: "Verified the fix." }]
      );

      const response = await request(app)
        .patch("/api/staff/tickets/20/status")
        .set("Cookie", cookie)
        .send({ status: to, expectedVersion: 4 });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe("INVALID_TRANSITION");
      expect(tx.ticket.updateMany).not.toHaveBeenCalled();
    }
  );

  it("blocks resolution until a completed action has a meaningful result, before checking the summary", async () => {
    const cookie = authAs();
    const { tx } = workflowTransaction(ticket({ status: "IN_PROGRESS" }), [
      { result: "   " },
      { result: null },
    ]);

    const response = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "RESOLVED", resolutionSummary: "", expectedVersion: 4 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("ACTION_RESULT_REQUIRED");
    expect(tx.ticket.updateMany).not.toHaveBeenCalled();
  });

  it("resolves atomically with an action result, summary, resolvedAt, and next version", async () => {
    const cookie = authAs();
    const { tx } = workflowTransaction(ticket({ status: "IN_PROGRESS" }), [
      { result: "Replaced the VPN profile." },
    ]);

    const response = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({
        status: "RESOLVED",
        resolutionSummary: "  Replaced the profile.  ",
        expectedVersion: 4,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "RESOLVED",
      resolutionSummary: "Replaced the profile.",
      version: 5,
    });
    expect(response.body.resolvedAt).toEqual(expect.any(String));
    expect(tx.actionTaken.findMany).toHaveBeenCalledWith({
      where: { ticketId: 20, status: "COMPLETED" },
      select: { result: true },
    });
    expect(tx.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 20, version: 4 },
        data: expect.objectContaining({
          status: "RESOLVED",
          resolutionSummary: "Replaced the profile.",
          appearsResolvedAt: null,
          version: { increment: 1 },
        }),
      })
    );
  });

  it("returns NOT_FOUND before validating a malformed status body", async () => {
    const cookie = authAs();
    const { tx } = workflowTransaction(ticket());
    tx.ticket.findUnique.mockResolvedValueOnce(null);

    const response = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "NOT_A_STATUS", expectedVersion: "not-a-version" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns SELF_SERVICE_FORBIDDEN before validating a malformed status body", async () => {
    const cookie = authAs();
    workflowTransaction(ticket({ requesterId: actor.id }));

    const response = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "NOT_A_STATUS", expectedVersion: "not-a-version" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("SELF_SERVICE_FORBIDDEN");
  });

  it.each(["owner", "priority"])(
    "returns NOT_FOUND before validating a malformed %s body",
    async (operation) => {
      const cookie = authAs();
      const { tx } = workflowTransaction(ticket());
      tx.ticket.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .patch(`/api/staff/tickets/20/${operation}`)
        .set("Cookie", cookie)
        .send({ unexpected: true });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    }
  );

  it.each(["owner", "priority"])(
    "returns SELF_SERVICE_FORBIDDEN before validating a malformed %s body",
    async (operation) => {
      const cookie = authAs();
      workflowTransaction(ticket({ requesterId: actor.id }));

      const response = await request(app)
        .patch(`/api/staff/tickets/20/${operation}`)
        .set("Cookie", cookie)
        .send({ unexpected: true });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("SELF_SERVICE_FORBIDDEN");
    }
  );

  it("returns 409 STALE_WRITE without changing the Ticket when expectedVersion is old", async () => {
    const cookie = authAs();
    const { tx } = workflowTransaction(ticket({ version: 5 }));

    const response = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "IN_PROGRESS", expectedVersion: 4 });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({
      code: "STALE_WRITE",
      details: {
        resource: "TICKET",
        id: 20,
        expectedVersion: 4,
        currentVersion: 5,
      },
    });
    expect(tx.ticket.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    {
      operation: "priority",
      method: "PATCH",
      path: "/api/staff/tickets/20/priority",
      userId: actor.id,
      role: actor.role,
      initial: ticket({ version: 5 }),
      body: { itPriority: "HIGH", expectedVersion: 4 },
    },
    {
      operation: "appears-resolved",
      method: "POST",
      path: "/api/tickets/20/appears-resolved",
      userId: 2,
      role: Role.REQUESTER,
      initial: ticket({ requesterId: 2, status: "OPEN", version: 5 }),
      body: { expectedVersion: 4 },
    },
    {
      operation: "requester reopen",
      method: "POST",
      path: "/api/tickets/20/reopen",
      userId: 2,
      role: Role.REQUESTER,
      initial: ticket({ requesterId: 2, status: "RESOLVED", version: 5 }),
      body: { expectedVersion: 4 },
    },
  ])(
    "rejects stale $operation writes without mutation",
    async ({ method, path, userId, role, initial, body }) => {
      const cookie = authAs(userId, role);
      const { tx, ticket: currentTicket } = workflowTransaction(initial);
      const route =
        method === "PATCH" ? request(app).patch(path) : request(app).post(path);

      const response = await route.set("Cookie", cookie).send(body);

      expect(response.status).toBe(409);
      expect(response.body.error).toMatchObject({
        code: "STALE_WRITE",
        details: {
          resource: "TICKET",
          id: 20,
          expectedVersion: 4,
          currentVersion: 5,
        },
      });
      expect(tx.ticket.updateMany).not.toHaveBeenCalled();
      expect(currentTicket).toEqual(initial);
    }
  );

  it("rejects missing versions and unknown request fields", async () => {
    const cookie = authAs();
    workflowTransaction(ticket());
    const first = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "IN_PROGRESS" });
    const second = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "IN_PROGRESS", expectedVersion: 4, requesterId: 9 });
    const missingOwner = await request(app)
      .patch("/api/staff/tickets/20/owner")
      .set("Cookie", cookie)
      .send({ expectedVersion: 4 });

    expect(first.status).toBe(400);
    expect(first.body.error.code).toBe("VALIDATION_ERROR");
    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe("VALIDATION_ERROR");
    expect(missingOwner.status).toBe(400);
    expect(missingOwner.body.error.details.fields.ownerId).toBe(
      "Owner is required"
    );
  });

  it("keeps requester appears-resolved advisory, versioned, and status-neutral", async () => {
    const cookie = authAs(2, Role.REQUESTER);
    const { tx } = workflowTransaction(
      ticket({ requesterId: 2, status: "OPEN" })
    );

    const response = await request(app)
      .post("/api/tickets/20/appears-resolved")
      .set("Cookie", cookie)
      .send({ expectedVersion: 4 });

    expect(response.status).toBe(200);
    expect(response.body.version).toBe(5);
    expect(response.body.appearsResolvedAt).toEqual(expect.any(String));
    expect(tx.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 20, requesterId: 2, version: 4 }),
        data: expect.objectContaining({
          appearsResolvedAt: expect.any(Date),
          version: { increment: 1 },
        }),
      })
    );
  });

  it.each(["appears-resolved", "reopen"])(
    "returns NOT_FOUND before validating a malformed %s body",
    async (operation) => {
      const cookie = authAs(2, Role.REQUESTER);
      const { tx } = workflowTransaction(ticket({ requesterId: 2 }));
      tx.ticket.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post(`/api/tickets/20/${operation}`)
        .set("Cookie", cookie)
        .send({ expectedVersion: "not-a-version" });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    }
  );

  it.each(["appears-resolved", "reopen"])(
    "returns FORBIDDEN before validating a malformed %s body",
    async (operation) => {
      const cookie = authAs(2, Role.REQUESTER);
      workflowTransaction(ticket({ requesterId: 3 }));

      const response = await request(app)
        .post(`/api/tickets/20/${operation}`)
        .set("Cookie", cookie)
        .send({ expectedVersion: "not-a-version" });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    }
  );

  it("reopens only the requester's Resolved Ticket and clears resolution state", async () => {
    const cookie = authAs(2, Role.REQUESTER);
    const { tx } = workflowTransaction(
      ticket({
        requesterId: 2,
        status: "RESOLVED",
        resolutionSummary: "Old summary.",
        appearsResolvedAt: new Date("2026-10-01T00:00:00.000Z"),
        resolvedAt: new Date("2026-10-01T00:00:00.000Z"),
      })
    );

    const response = await request(app)
      .post("/api/tickets/20/reopen")
      .set("Cookie", cookie)
      .send({ expectedVersion: 4 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "REOPENED",
      resolutionSummary: null,
      appearsResolvedAt: null,
      resolvedAt: null,
      version: 5,
    });
    expect(tx.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 20, requesterId: 2, status: "RESOLVED", version: 4 },
        data: expect.objectContaining({
          status: "REOPENED",
          resolutionSummary: null,
          appearsResolvedAt: null,
          resolvedAt: null,
          version: { increment: 1 },
        }),
      })
    );
  });
});
