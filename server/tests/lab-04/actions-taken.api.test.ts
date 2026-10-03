import { ActionStatus, Role } from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";
import { sessionCookie, sessionUser } from "../helpers/session";

const ACTOR = {
  id: 9,
  name: "Kittipong Saelim",
  role: Role.IT_STAFF,
  isActive: true,
};
const ASSIGNEE = {
  id: 10,
  name: "Nattapong Chaiyo",
  role: Role.IT_STAFF,
  isActive: true,
};
const CREATED_AT = new Date("2026-10-01T10:00:00.000Z");
const UPDATED_AT = new Date("2026-10-01T10:00:00.000Z");

function authAs(
  id = ACTOR.id,
  role: Role = ACTOR.role,
  extraUsers: Record<
    number,
    { role: Role; isActive: boolean; name: string }
  > = {}
) {
  vi.spyOn(prisma.user, "findUnique").mockImplementation((async (args: {
    where?: { id?: number };
  }) => {
    const requestedId = args.where?.id;
    if (requestedId === id) {
      return sessionUser({
        id,
        role,
        name: id === ACTOR.id ? ACTOR.name : `User ${id}`,
        mustChangePassword: false,
      }) as never;
    }
    const extra =
      requestedId === undefined ? undefined : extraUsers[requestedId];
    if (extra) {
      return sessionUser({
        id: requestedId!,
        role: extra.role,
        name: extra.name,
        isActive: extra.isActive,
        mustChangePassword: false,
      }) as never;
    }
    return null as never;
  }) as never);
  return sessionCookie({ id, role });
}

function actionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 501,
    ticketId: 20,
    title: "Check VPN concentrator",
    details: "Inspect the concentrator logs and test a fresh connection.",
    result: null,
    performedById: ACTOR.id,
    assigneeId: ASSIGNEE.id,
    status: ActionStatus.PLANNED,
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    version: 1,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    completedAt: null,
    performedBy: ACTOR,
    assignee: ASSIGNEE,
    ...overrides,
  };
}

function ticketRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 20,
    requesterId: 2,
    status: "OPEN",
    version: 4,
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Action Taken reads", () => {
  it("lists a requester's own actions with the parent version", async () => {
    const cookie = authAs(2, Role.REQUESTER);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(
      ticketRow({ requesterId: 2 }) as never
    );
    vi.spyOn(prisma.actionTaken, "findMany").mockResolvedValue([
      actionRow(),
    ] as never);

    const response = await request(app)
      .get("/api/tickets/20/actions")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.ticketVersion).toBe(4);
    expect(response.body.actions[0]).toMatchObject({
      id: 501,
      ticketId: 20,
      performedBy: ACTOR,
      assignee: ASSIGNEE,
    });
    expect(response.body.actions[0]).not.toHaveProperty("performedById");
  });

  it("refuses a foreign ticket without revealing action data", async () => {
    const cookie = authAs(2, Role.REQUESTER);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(
      ticketRow({ requesterId: 99 }) as never
    );
    const actions = vi.spyOn(prisma.actionTaken, "findMany");

    const response = await request(app)
      .get("/api/tickets/20/actions")
      .set("Cookie", cookie);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: { code: "FORBIDDEN", message: "Access denied" },
    });
    expect(actions).not.toHaveBeenCalled();
    expect(JSON.stringify(response.body)).not.toContain("Check VPN");
  });

  it("returns active IT Staff only for the staff assignee picker", async () => {
    const cookie = authAs();
    vi.spyOn(prisma.user, "findMany").mockResolvedValue([ASSIGNEE] as never);

    const response = await request(app)
      .get("/api/staff/action-assignees")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ assignees: [ASSIGNEE] });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: Role.IT_STAFF, isActive: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      })
    );
  });

  it("rejects query parameters on the assignee picker", async () => {
    const cookie = authAs();
    const findMany = vi
      .spyOn(prisma.user, "findMany")
      .mockResolvedValue([] as never);

    const response = await request(app)
      .get("/api/staff/action-assignees?includeInactive=true")
      .set("Cookie", cookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_QUERY");
    expect(findMany).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "action list",
      path: "/api/tickets/20/actions",
      userId: 2,
      role: Role.REQUESTER,
    },
    {
      name: "action detail",
      path: "/api/tickets/20/actions/501",
      userId: 2,
      role: Role.REQUESTER,
    },
    {
      name: "action history",
      path: "/api/tickets/20/actions/501/history",
      userId: 2,
      role: Role.REQUESTER,
    },
    {
      name: "action assignee picker",
      path: "/api/staff/action-assignees",
      userId: ACTOR.id,
      role: Role.IT_STAFF,
    },
  ])("rejects request bodies on the $name GET endpoint", async (route) => {
    const cookie = authAs(route.userId, route.role);
    const ticketLookup = vi
      .spyOn(prisma.ticket, "findUnique")
      .mockResolvedValue(ticketRow({ requesterId: 2 }) as never);
    const assigneeLookup = vi
      .spyOn(prisma.user, "findMany")
      .mockResolvedValue([ASSIGNEE] as never);
    vi.spyOn(prisma.actionTaken, "findMany").mockResolvedValue([
      actionRow(),
    ] as never);
    vi.spyOn(prisma.actionTaken, "findFirst").mockResolvedValue(
      actionRow() as never
    );
    vi.spyOn(prisma.actionEvent, "findMany").mockResolvedValue([] as never);

    const response = await request(app)
      .get(route.path)
      .set("Cookie", cookie)
      .set("Content-Type", "application/json")
      .send({ unexpected: true });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Invalid request",
    });
    expect(ticketLookup).not.toHaveBeenCalled();
    expect(assigneeLookup).not.toHaveBeenCalled();
  });

  it("returns ordered immutable history for a readable action", async () => {
    const cookie = authAs(2, Role.REQUESTER);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(
      ticketRow({ requesterId: 2 }) as never
    );
    vi.spyOn(prisma.actionTaken, "findFirst").mockResolvedValue(
      actionRow() as never
    );
    const event = {
      id: 700,
      actionId: 501,
      actor: ACTOR,
      type: "CREATED",
      previousVersion: null,
      newVersion: 1,
      occurredAt: CREATED_AT,
      before: null,
      after: { status: ActionStatus.PLANNED, version: 1 },
    };
    const findMany = vi
      .spyOn(prisma.actionEvent, "findMany")
      .mockResolvedValue([event] as never);

    const response = await request(app)
      .get("/api/tickets/20/actions/501/history")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.events[0]).toMatchObject({
      id: 700,
      actionId: 501,
      actor: ACTOR,
      type: "CREATED",
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { actionId: 501 },
        orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
      })
    );
  });
});

describe("Action Taken creation", () => {
  it("derives performedBy from the session and writes the action/event atomically", async () => {
    const cookie = authAs();
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(
      ticketRow() as never
    );
    const action = actionRow();
    const tx = {
      actionCreationRequest: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      ticket: {
        findUnique: vi.fn().mockResolvedValue({ status: "OPEN", version: 4 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: { findFirst: vi.fn().mockResolvedValue({ id: ASSIGNEE.id }) },
      actionTaken: { create: vi.fn().mockResolvedValue(action) },
      actionEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback(tx)
    );

    const response = await request(app)
      .post("/api/staff/tickets/20/actions")
      .set("Cookie", cookie)
      .set("Idempotency-Key", "11111111-1111-4111-8111-111111111111")
      .send({
        title: "Check VPN concentrator",
        details: "Inspect the concentrator logs and test a fresh connection.",
        assigneeId: ASSIGNEE.id,
        expectedTicketVersion: 4,
        performedById: 999,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(tx.actionTaken.create).not.toHaveBeenCalled();

    const validResponse = await request(app)
      .post("/api/staff/tickets/20/actions")
      .set("Cookie", cookie)
      .set("Idempotency-Key", "11111111-1111-4111-8111-111111111111")
      .send({
        title: "Check VPN concentrator",
        details: "Inspect the concentrator logs and test a fresh connection.",
        assigneeId: ASSIGNEE.id,
        expectedTicketVersion: 4,
      });

    expect(validResponse.status).toBe(201);
    expect(tx.actionTaken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          performedById: ACTOR.id,
          status: ActionStatus.PLANNED,
          version: 1,
        }),
      })
    );
    expect(tx.actionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: ACTOR.id,
          type: "CREATED",
          previousVersion: null,
        }),
      })
    );
    expect(validResponse.body.ticketVersion).toBe(5);
  });

  it("allows an Administrator to create an action as the authenticated performer", async () => {
    const adminId = 11;
    const cookie = authAs(adminId, Role.ADMINISTRATOR);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(
      ticketRow() as never
    );
    const adminRef = {
      id: adminId,
      name: "User 11",
      role: Role.ADMINISTRATOR,
      isActive: true,
    };
    const tx = {
      actionCreationRequest: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      ticket: {
        findUnique: vi.fn().mockResolvedValue({ status: "OPEN", version: 4 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: { findFirst: vi.fn() },
      actionTaken: {
        create: vi.fn().mockResolvedValue(
          actionRow({
            performedById: adminId,
            performedBy: adminRef,
            assigneeId: null,
            assignee: null,
          })
        ),
      },
      actionEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback(tx)
    );

    const response = await request(app)
      .post("/api/staff/tickets/20/actions")
      .set("Cookie", cookie)
      .set("Idempotency-Key", "66666666-6666-4666-8666-666666666666")
      .send({
        title: "Review backup status",
        details: "Confirm the backup job completed successfully.",
        expectedTicketVersion: 4,
      });

    expect(response.status).toBe(201);
    expect(response.body.action.performedBy).toEqual(adminRef);
    expect(tx.actionTaken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ performedById: adminId }),
      })
    );
    expect(tx.user.findFirst).not.toHaveBeenCalled();
  });

  it("refuses Requester create and edit attempts before loading staff resources", async () => {
    const cookie = authAs(12, Role.REQUESTER);
    const ticketLookup = vi.spyOn(prisma.ticket, "findUnique");
    const create = await request(app)
      .post("/api/staff/tickets/20/actions")
      .set("Cookie", cookie)
      .set("Idempotency-Key", "77777777-7777-4777-8777-777777777777")
      .send({
        title: "Unauthorized",
        details: "Should not be accepted.",
        expectedTicketVersion: 1,
      });
    const edit = await request(app)
      .patch("/api/staff/tickets/20/actions/501")
      .set("Cookie", cookie)
      .send({
        expectedVersion: 1,
        expectedTicketVersion: 1,
        title: "Unauthorized",
      });

    expect(create.status).toBe(403);
    expect(create.body.error.code).toBe("FORBIDDEN");
    expect(edit.status).toBe(403);
    expect(edit.body.error.code).toBe("FORBIDDEN");
    expect(ticketLookup).not.toHaveBeenCalled();
  });

  it("rejects self-service writes and stale parent versions", async () => {
    const cookie = authAs(2, Role.IT_STAFF);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(
      ticketRow({ requesterId: 2 }) as never
    );
    const response = await request(app)
      .post("/api/staff/tickets/20/actions")
      .set("Cookie", cookie)
      .set("Idempotency-Key", "22222222-2222-4222-8222-222222222222")
      .send({ title: "A", details: "B", expectedTicketVersion: 4 });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("SELF_SERVICE_FORBIDDEN");

    vi.restoreAllMocks();
    authAs();
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(
      ticketRow() as never
    );
    const tx = {
      actionCreationRequest: { findUnique: vi.fn().mockResolvedValue(null) },
      ticket: {
        findUnique: vi.fn().mockResolvedValue({ status: "OPEN", version: 5 }),
      },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback(tx)
    );
    const stale = await request(app)
      .post("/api/staff/tickets/20/actions")
      .set("Cookie", sessionCookie({ id: ACTOR.id, role: ACTOR.role }))
      .set("Idempotency-Key", "33333333-3333-4333-8333-333333333333")
      .send({ title: "A", details: "B", expectedTicketVersion: 4 });
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatchObject({ code: "STALE_WRITE" });
    expect(stale.body.error.details).toMatchObject({
      resource: "TICKET",
      expectedVersion: 4,
      currentVersion: 5,
    });
  });

  it("rejects inactive or non-staff assignees before creating an action", async () => {
    const cookie = authAs();
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(
      ticketRow() as never
    );
    const tx = {
      actionCreationRequest: { findUnique: vi.fn().mockResolvedValue(null) },
      ticket: {
        findUnique: vi.fn().mockResolvedValue({ status: "OPEN", version: 4 }),
      },
      user: { findFirst: vi.fn().mockResolvedValue(null) },
      actionTaken: { create: vi.fn() },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback(tx)
    );

    const response = await request(app)
      .post("/api/staff/tickets/20/actions")
      .set("Cookie", cookie)
      .set("Idempotency-Key", "44444444-4444-4444-8444-444444444444")
      .send({
        title: "Check VPN concentrator",
        details: "Inspect logs.",
        assigneeId: 99,
        expectedTicketVersion: 4,
      });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("ASSIGNEE_NOT_ELIGIBLE");
    expect(tx.actionTaken.create).not.toHaveBeenCalled();
  });

  it("replays the original create response and conflicts on changed payloads", async () => {
    const cookie = authAs();
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(
      ticketRow() as never
    );
    const action = actionRow();
    let storedRequest: Record<string, unknown> | null = null;
    const tx = {
      actionCreationRequest: {
        findUnique: vi.fn().mockImplementation(async () => storedRequest),
        create: vi
          .fn()
          .mockImplementation(
            async (args: { data: Record<string, unknown> }) => {
              storedRequest = args.data;
              return args.data;
            }
          ),
      },
      ticket: {
        findUnique: vi.fn().mockResolvedValue({ status: "OPEN", version: 4 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: { findFirst: vi.fn().mockResolvedValue({ id: ASSIGNEE.id }) },
      actionTaken: { create: vi.fn().mockResolvedValue(action) },
      actionEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback(tx)
    );
    const body = {
      title: "Check VPN concentrator",
      details: "Inspect logs.",
      expectedTicketVersion: 4,
    };
    const key = "55555555-5555-4555-8555-555555555555";

    const first = await request(app)
      .post("/api/staff/tickets/20/actions")
      .set("Cookie", cookie)
      .set("Idempotency-Key", key)
      .send(body);
    const replay = await request(app)
      .post("/api/staff/tickets/20/actions")
      .set("Cookie", cookie)
      .set("Idempotency-Key", key)
      .send(body);
    const conflict = await request(app)
      .post("/api/staff/tickets/20/actions")
      .set("Cookie", cookie)
      .set("Idempotency-Key", key)
      .send({ ...body, title: "Different title" });

    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(first.body);
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(tx.actionTaken.create).toHaveBeenCalledTimes(1);
    expect(tx.actionEvent.create).toHaveBeenCalledTimes(1);
  });

  it("replays the winner when a concurrent idempotency insert hits the unique key", async () => {
    const cookie = authAs();
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(
      ticketRow() as never
    );
    const action = actionRow();
    let storedRequest: Record<string, unknown> | null = null;
    const tx = {
      actionCreationRequest: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi
          .fn()
          .mockImplementation(
            async (args: { data: Record<string, unknown> }) => {
              storedRequest = args.data;
              return args.data;
            }
          ),
      },
      ticket: {
        findUnique: vi.fn().mockResolvedValue({ status: "OPEN", version: 4 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: { findFirst: vi.fn().mockResolvedValue({ id: ASSIGNEE.id }) },
      actionTaken: { create: vi.fn().mockResolvedValue(action) },
      actionEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    const transaction = vi.spyOn(prisma, "$transaction");
    transaction.mockImplementationOnce(async (callback: any) => callback(tx));
    transaction.mockImplementation(async () => {
      throw { code: "P2002" };
    });
    vi.spyOn(prisma.actionCreationRequest, "findUnique").mockImplementation(
      (async () => storedRequest) as any
    );
    const body = {
      title: "Check VPN concentrator",
      details: "Inspect logs.",
      expectedTicketVersion: 4,
    };
    const key = "88888888-8888-4888-8888-888888888888";

    const created = await request(app)
      .post("/api/staff/tickets/20/actions")
      .set("Cookie", cookie)
      .set("Idempotency-Key", key)
      .send(body);
    const replay = await request(app)
      .post("/api/staff/tickets/20/actions")
      .set("Cookie", cookie)
      .set("Idempotency-Key", key)
      .send(body);
    const conflict = await request(app)
      .post("/api/staff/tickets/20/actions")
      .set("Cookie", cookie)
      .set("Idempotency-Key", key)
      .send({ ...body, title: "Different title" });

    expect(created.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(created.body);
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(tx.actionTaken.create).toHaveBeenCalledTimes(1);
    expect(tx.actionEvent.create).toHaveBeenCalledTimes(1);
  });
});

describe("Action Taken editing", () => {
  it("updates a non-terminal action, increments both versions, and records history", async () => {
    const cookie = authAs();
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(
      ticketRow() as never
    );
    vi.spyOn(prisma.actionTaken, "findFirst").mockResolvedValue(
      actionRow() as never
    );
    const updated = actionRow({
      version: 2,
      status: ActionStatus.IN_PROGRESS,
      updatedAt: new Date("2026-10-01T10:05:00.000Z"),
    });
    const tx = {
      ticket: {
        findUnique: vi.fn().mockResolvedValue({
          requesterId: 2,
          status: "OPEN",
          version: 4,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      actionTaken: {
        findFirst: vi.fn().mockResolvedValue(actionRow()),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue(updated),
      },
      actionEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback(tx)
    );

    const response = await request(app)
      .patch("/api/staff/tickets/20/actions/501")
      .set("Cookie", cookie)
      .send({
        expectedVersion: 1,
        expectedTicketVersion: 4,
        status: ActionStatus.IN_PROGRESS,
      });

    expect(response.status).toBe(200);
    expect(response.body.action.version).toBe(2);
    expect(response.body.ticketVersion).toBe(5);
    expect(tx.actionTaken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 501, version: 1 },
        data: expect.objectContaining({
          status: ActionStatus.IN_PROGRESS,
          version: { increment: 1 },
        }),
      })
    );
    expect(tx.actionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "STATUS_CHANGED",
          previousVersion: 1,
          newVersion: 2,
        }),
      })
    );
  });

  it("allows an Administrator to update an action and records the Admin as audit actor", async () => {
    const adminId = 11;
    const cookie = authAs(adminId, Role.ADMINISTRATOR);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(
      ticketRow() as never
    );
    vi.spyOn(prisma.actionTaken, "findFirst").mockResolvedValue(
      actionRow() as never
    );
    const updated = actionRow({
      title: "Review backup status",
      version: 2,
      updatedAt: new Date("2026-10-01T10:05:00.000Z"),
    });
    const recordEvent = vi.fn().mockResolvedValue({});
    const tx = {
      ticket: {
        findUnique: vi.fn().mockResolvedValue({
          requesterId: 2,
          status: "OPEN",
          version: 4,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      actionTaken: {
        findFirst: vi.fn().mockResolvedValue(actionRow()),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue(updated),
      },
      actionEvent: { create: recordEvent },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback(tx)
    );

    const response = await request(app)
      .patch("/api/staff/tickets/20/actions/501")
      .set("Cookie", cookie)
      .send({
        expectedVersion: 1,
        expectedTicketVersion: 4,
        title: "Review backup status",
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      action: {
        id: 501,
        title: "Review backup status",
        performedBy: ACTOR,
        version: 2,
      },
      ticketVersion: 5,
    });
    expect(recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: adminId,
          type: "EDITED",
          previousVersion: 1,
          newVersion: 2,
        }),
      })
    );
  });

  it("rejects a stale Action version without changing the action, ticket, or history", async () => {
    const cookie = authAs();
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(
      ticketRow() as never
    );
    const storedAction = actionRow({ version: 2 });
    vi.spyOn(prisma.actionTaken, "findFirst").mockResolvedValue(
      storedAction as never
    );
    const actionBefore = { ...storedAction };
    const updateAction = vi.fn(async () => {
      Object.assign(storedAction, { title: "Overwritten stale action" });
      return { count: 1 };
    });
    const updateTicket = vi.fn().mockResolvedValue({ count: 1 });
    const appendEvent = vi.fn().mockResolvedValue({});
    const tx = {
      ticket: {
        findUnique: vi.fn().mockResolvedValue({
          requesterId: 2,
          status: "OPEN",
          version: 4,
        }),
        updateMany: updateTicket,
      },
      actionTaken: {
        findFirst: vi.fn().mockResolvedValue(storedAction),
        updateMany: updateAction,
      },
      actionEvent: { create: appendEvent },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback(tx)
    );

    const response = await request(app)
      .patch("/api/staff/tickets/20/actions/501")
      .set("Cookie", cookie)
      .send({
        expectedVersion: 1,
        expectedTicketVersion: 4,
        title: "Overwrite with stale client data",
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({
      code: "STALE_WRITE",
      details: {
        resource: "ACTION_TAKEN",
        id: 501,
        expectedVersion: 1,
        currentVersion: 2,
      },
    });
    expect(updateAction).not.toHaveBeenCalled();
    expect(updateTicket).not.toHaveBeenCalled();
    expect(appendEvent).not.toHaveBeenCalled();
    expect(storedAction).toEqual(actionBefore);
  });

  it("requires a result to complete and refuses terminal edits", async () => {
    const cookie = authAs();
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(
      ticketRow() as never
    );
    vi.spyOn(prisma.actionTaken, "findFirst").mockResolvedValue(
      actionRow({ status: ActionStatus.IN_PROGRESS }) as never
    );
    const tx = {
      ticket: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ requesterId: 2, status: "OPEN", version: 4 }),
      },
      actionTaken: {
        findFirst: vi
          .fn()
          .mockResolvedValue(actionRow({ status: ActionStatus.IN_PROGRESS })),
      },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback(tx)
    );

    const missingResult = await request(app)
      .patch("/api/staff/tickets/20/actions/501")
      .set("Cookie", cookie)
      .send({
        expectedVersion: 1,
        expectedTicketVersion: 4,
        status: ActionStatus.COMPLETED,
      });
    expect(missingResult.status).toBe(400);
    expect(missingResult.body.error.code).toBe("ACTION_RESULT_REQUIRED");

    vi.restoreAllMocks();
    authAs();
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(
      ticketRow() as never
    );
    vi.spyOn(prisma.actionTaken, "findFirst").mockResolvedValue(
      actionRow({ status: ActionStatus.COMPLETED }) as never
    );
    const terminalTx = {
      ticket: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ requesterId: 2, status: "OPEN", version: 4 }),
      },
      actionTaken: {
        findFirst: vi
          .fn()
          .mockResolvedValue(actionRow({ status: ActionStatus.COMPLETED })),
      },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) =>
      callback(terminalTx)
    );
    const terminal = await request(app)
      .patch("/api/staff/tickets/20/actions/501")
      .set("Cookie", sessionCookie({ id: ACTOR.id, role: ACTOR.role }))
      .send({
        expectedVersion: 1,
        expectedTicketVersion: 4,
        title: "New title",
      });
    expect(terminal.status).toBe(422);
    expect(terminal.body.error.code).toBe("INVALID_ACTION_TRANSITION");
  });
});
