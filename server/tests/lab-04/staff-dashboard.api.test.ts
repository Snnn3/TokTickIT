import {
  ActionStatus,
  Prisma,
  Role,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";
import { sessionCookie, sessionUser } from "../helpers/session";

const STAFF = {
  id: 9,
  name: "Kittipong Saelim",
  role: Role.IT_STAFF,
  isActive: true,
};

const OWNER = {
  id: 10,
  name: "Manasporn Thongdee",
  role: Role.IT_STAFF,
  isActive: true,
};

function authAs(id = STAFF.id, role: Role = Role.IT_STAFF) {
  vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
    sessionUser({ id, role, mustChangePassword: false })
  );
  return sessionCookie({ id, role });
}

function mockDashboardTransaction() {
  const seen: {
    ticketCountWhere: Record<string, unknown>[];
    actionCountWhere?: Record<string, unknown>;
    ticketListArgs?: Record<string, unknown>;
    actionListArgs?: Record<string, unknown>;
    options?: Record<string, unknown>;
  } = { ticketCountWhere: [] };

  const transactionClient = {
    ticket: {
      groupBy: vi.fn().mockResolvedValue([
        { status: TicketStatus.CLOSED, _count: { _all: 8 } },
        { status: TicketStatus.IN_PROGRESS, _count: { _all: 12 } },
      ]),
      count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        seen.ticketCountWhere.push(where);
        return [12, 3, 4][seen.ticketCountWhere.length - 1];
      }),
      findMany: vi.fn(async (args: Record<string, unknown>) => {
        seen.ticketListArgs = args;
        return [
          {
            id: 31,
            number: "TKT-2026-00031",
            summary: "Email client cannot connect",
            status: TicketStatus.IN_PROGRESS,
            requestedPriority: TicketPriority.MEDIUM,
            itPriority: TicketPriority.HIGH,
            owner: OWNER,
            version: 4,
            createdAt: new Date("2026-10-07T12:00:00.000Z"),
            updatedAt: new Date("2026-10-08T01:00:00.000Z"),
            resolvedAt: null,
          },
        ];
      }),
    },
    actionTaken: {
      count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        seen.actionCountWhere = where;
        return 2;
      }),
      findMany: vi.fn(async (args: Record<string, unknown>) => {
        seen.actionListArgs = args;
        return [
          {
            id: 401,
            ticketId: 31,
            ticket: { number: "TKT-2026-00031" },
            title: "Inspect network logs",
            status: ActionStatus.PLANNED,
            performedBy: STAFF,
            assignee: OWNER,
            version: 2,
            createdAt: new Date("2026-10-08T00:00:00.000Z"),
            updatedAt: new Date("2026-10-08T00:00:00.000Z"),
          },
        ];
      }),
    },
  };

  vi.spyOn(prisma, "$transaction").mockImplementation((async (
    callback: (tx: unknown) => Promise<unknown>,
    options: unknown
  ) => {
    seen.options = options as Record<string, unknown>;
    return callback(transactionClient);
  }) as never);

  return { seen, transactionClient };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/dashboard/staff (API4-04, AC-12, AC-13, AC-16)", () => {
  it("requires authentication before parsing a GET body", async () => {
    const response = await request(app)
      .get("/api/dashboard/staff")
      .set("Content-Type", "application/json")
      .send("{ malformed");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("refuses Requesters without querying dashboard data", async () => {
    const cookie = authAs(2, Role.REQUESTER);
    const transaction = vi.spyOn(prisma, "$transaction");

    const response = await request(app)
      .get("/api/dashboard/staff")
      .set("Cookie", cookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([Role.IT_STAFF, Role.ADMINISTRATOR])(
    "returns the current user's snapshot for %s with authoritative counts and latest-five lists",
    async (role) => {
      const cookie = authAs(9, role);
      const { seen } = mockDashboardTransaction();

      const response = await request(app)
        .get("/api/dashboard/staff")
        .set("Cookie", cookie);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        windowDays: 7,
        metrics: {
          openTickets: 12,
          unassignedTickets: 3,
          myOwnedTickets: 4,
          myActiveActions: 2,
        },
        groupings: {
          ticketsByStatus: [
            { status: "NEW", count: 0 },
            { status: "OPEN", count: 0 },
            { status: "IN_PROGRESS", count: 12 },
            { status: "WAITING_FOR_REQUESTER", count: 0 },
            { status: "RESOLVED", count: 0 },
            { status: "CLOSED", count: 8 },
            { status: "REOPENED", count: 0 },
            { status: "CANCELLED", count: 0 },
          ],
        },
        lists: {
          recentTickets: [
            {
              id: 31,
              number: "TKT-2026-00031",
              owner: OWNER,
            },
          ],
          myRecentActions: [
            {
              id: 401,
              ticketId: 31,
              ticketNumber: "TKT-2026-00031",
              performedBy: STAFF,
            },
          ],
        },
      });

      const asOf = new Date(response.body.asOf).getTime();
      const from = asOf - 7 * 24 * 60 * 60 * 1000;
      expect(Number.isNaN(asOf)).toBe(false);
      expect(seen.ticketCountWhere).toEqual([
        {
          status: {
            in: [
              "NEW",
              "OPEN",
              "IN_PROGRESS",
              "WAITING_FOR_REQUESTER",
              "REOPENED",
            ],
          },
        },
        {
          status: {
            in: [
              "NEW",
              "OPEN",
              "IN_PROGRESS",
              "WAITING_FOR_REQUESTER",
              "REOPENED",
            ],
          },
          ownerId: null,
        },
        {
          status: {
            in: [
              "NEW",
              "OPEN",
              "IN_PROGRESS",
              "WAITING_FOR_REQUESTER",
              "REOPENED",
            ],
          },
          ownerId: STAFF.id,
        },
      ]);
      expect(seen.actionCountWhere).toEqual({
        performedById: STAFF.id,
        status: { in: [ActionStatus.PLANNED, ActionStatus.IN_PROGRESS] },
      });
      expect(seen.ticketListArgs).toMatchObject({
        where: {
          status: {
            in: [
              TicketStatus.NEW,
              TicketStatus.OPEN,
              TicketStatus.IN_PROGRESS,
              TicketStatus.WAITING_FOR_REQUESTER,
              TicketStatus.REOPENED,
            ],
          },
          updatedAt: { gte: new Date(from), lte: new Date(asOf) },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 5,
      });
      expect(seen.actionListArgs).toMatchObject({
        where: {
          performedById: STAFF.id,
          createdAt: { gte: new Date(from), lte: new Date(asOf) },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
      });
      expect(seen.options?.isolationLevel).toBe(
        Prisma.TransactionIsolationLevel.RepeatableRead
      );
    }
  );

  it("rejects unexpected query input instead of broadening identity scope", async () => {
    const cookie = authAs();
    const { transactionClient } = mockDashboardTransaction();

    const response = await request(app)
      .get("/api/dashboard/staff?userId=10")
      .set("Cookie", cookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_QUERY");
    expect(transactionClient.ticket.count).not.toHaveBeenCalled();
  });

  it("rejects a request body after authorization and returns a safe failure", async () => {
    const cookie = authAs();
    const transaction = vi.spyOn(prisma, "$transaction");

    const withBody = await request(app)
      .get("/api/dashboard/staff")
      .set("Cookie", cookie)
      .send({ userId: 10 });
    expect(withBody.status).toBe(400);
    expect(withBody.body.error.code).toBe("VALIDATION_ERROR");
    expect(transaction).not.toHaveBeenCalled();

    transaction.mockRejectedValueOnce(new Error("database detail"));
    const failure = await request(app)
      .get("/api/dashboard/staff")
      .set("Cookie", cookie);
    expect(failure.status).toBe(500);
    expect(failure.body.error.message).toBe(
      "Failed to load the staff dashboard"
    );
    expect(JSON.stringify(failure.body)).not.toContain("database detail");
  });

  it("returns zero counts and empty lists when the staff workspace has no data", async () => {
    const cookie = authAs();
    const tx = {
      ticket: {
        groupBy: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
      actionTaken: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation((async (
      callback: (client: unknown) => Promise<unknown>
    ) => callback(tx)) as never);

    const response = await request(app)
      .get("/api/dashboard/staff")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.metrics).toEqual({
      openTickets: 0,
      unassignedTickets: 0,
      myOwnedTickets: 0,
      myActiveActions: 0,
    });
    expect(response.body.lists).toEqual({
      recentTickets: [],
      myRecentActions: [],
    });
    expect(response.body.groupings.ticketsByStatus).toEqual([
      { status: "NEW", count: 0 },
      { status: "OPEN", count: 0 },
      { status: "IN_PROGRESS", count: 0 },
      { status: "WAITING_FOR_REQUESTER", count: 0 },
      { status: "RESOLVED", count: 0 },
      { status: "CLOSED", count: 0 },
      { status: "REOPENED", count: 0 },
      { status: "CANCELLED", count: 0 },
    ]);
  });
});
