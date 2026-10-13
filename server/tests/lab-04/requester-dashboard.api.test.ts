import { Prisma, Role, TicketPriority, TicketStatus } from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";
import { sessionCookie, sessionUser } from "../helpers/session";

const REQUESTER_ID = 17;
const OTHER_REQUESTER_ID = 29;

function authenticate(id = REQUESTER_ID, role: Role = Role.REQUESTER) {
  vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
    sessionUser({ id, role, mustChangePassword: false })
  );
  return sessionCookie({ id, role });
}

function mockRequesterDashboard() {
  const seen: {
    ticketCountWhere: Record<string, unknown>[];
    ticketListArgs: Record<string, unknown>[];
    options?: Record<string, unknown>;
  } = { ticketCountWhere: [], ticketListArgs: [] };
  const ticket = {
    count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      seen.ticketCountWhere.push(where);
      return [4, 2, 3, 1][seen.ticketCountWhere.length - 1];
    }),
    findMany: vi.fn(async (args: Record<string, unknown>) => {
      seen.ticketListArgs.push(args);
      const index = seen.ticketListArgs.length;
      return [
        {
          id: 84,
          number: "TKT-2026-00084",
          summary: "Awaiting requester response",
          status: TicketStatus.WAITING_FOR_REQUESTER,
          requestedPriority: TicketPriority.MEDIUM,
          itPriority: TicketPriority.HIGH,
          owner: null,
          version: 3,
          createdAt: new Date("2026-10-01T01:00:00.000Z"),
          updatedAt: new Date("2026-10-08T00:00:00.000Z"),
          resolvedAt: null,
        },
      ].slice(0, index);
    }),
  };
  const tx = { ticket };
  vi.spyOn(prisma, "$transaction").mockImplementation((async (
    callback: (transaction: unknown) => Promise<unknown>,
    options: unknown
  ) => {
    seen.options = options as Record<string, unknown>;
    return callback(tx);
  }) as never);
  return { seen, ticket };
}

beforeEach(() => vi.restoreAllMocks());

describe("GET /api/dashboard/requester (API4-03, AC-11, AC-13, AC-16)", () => {
  it.each([Role.REQUESTER, Role.IT_STAFF, Role.ADMINISTRATOR])(
    "returns the authenticated user's requester-capacity snapshot for %s",
    async (role) => {
      const cookie = authenticate(REQUESTER_ID, role);
      const { seen, ticket } = mockRequesterDashboard();

      const response = await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", cookie);

      expect(response.status).toBe(200);
      expect(response.body.windowDays).toBe(7);
      expect(response.body.metrics).toEqual({
        openTickets: 4,
        waitingForRequester: 2,
        recentlyUpdated: 3,
        recentlyResolved: 1,
      });
      expect(response.body.lists.attentionTickets).toHaveLength(1);
      expect(response.body.lists.recentTickets).toHaveLength(1);
      expect(response.body.lists.resolvedTickets).toHaveLength(1);

      const asOf = new Date(response.body.asOf).getTime();
      const from = new Date(asOf - 7 * 24 * 60 * 60 * 1000);
      expect(Number.isNaN(asOf)).toBe(false);
      expect(seen.ticketCountWhere).toEqual([
        {
          requesterId: REQUESTER_ID,
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
        { requesterId: REQUESTER_ID, status: "WAITING_FOR_REQUESTER" },
        {
          requesterId: REQUESTER_ID,
          updatedAt: { gte: from, lte: new Date(asOf) },
        },
        {
          requesterId: REQUESTER_ID,
          status: { in: ["RESOLVED", "CLOSED"] },
          resolvedAt: { gte: from, lte: new Date(asOf) },
        },
      ]);
      expect(seen.ticketListArgs).toEqual([
        expect.objectContaining({
          where: { requesterId: REQUESTER_ID, status: "WAITING_FOR_REQUESTER" },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 5,
        }),
        expect.objectContaining({
          where: {
            requesterId: REQUESTER_ID,
            updatedAt: { gte: from, lte: new Date(asOf) },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 5,
        }),
        expect.objectContaining({
          where: {
            requesterId: REQUESTER_ID,
            status: { in: ["RESOLVED", "CLOSED"] },
            resolvedAt: { gte: from, lte: new Date(asOf) },
          },
          orderBy: [{ resolvedAt: "desc" }, { id: "desc" }],
          take: 5,
        }),
      ]);
      expect(seen.options?.isolationLevel).toBe(
        Prisma.TransactionIsolationLevel.RepeatableRead
      );
      expect(ticket.findMany).toHaveBeenCalledTimes(3);
      expect(JSON.stringify(response.body)).not.toContain(
        String(OTHER_REQUESTER_ID)
      );
    }
  );

  it("requires an authenticated session before querying requester data", async () => {
    const transaction = vi.spyOn(prisma, "$transaction");
    const response = await request(app).get("/api/dashboard/requester");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects identity overrides in query strings and bodies", async () => {
    const cookie = authenticate();
    const transaction = vi.spyOn(prisma, "$transaction");
    const queryResponse = await request(app)
      .get("/api/dashboard/requester?requesterId=" + OTHER_REQUESTER_ID)
      .set("Cookie", cookie);
    const bodyResponse = await request(app)
      .get("/api/dashboard/requester")
      .set("Cookie", cookie)
      .send({ requesterId: OTHER_REQUESTER_ID });

    expect(queryResponse.status).toBe(400);
    expect(queryResponse.body.error.code).toBe("INVALID_QUERY");
    expect(bodyResponse.status).toBe(400);
    expect(bodyResponse.body.error.code).toBe("VALIDATION_ERROR");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns safe zero metrics and empty lists for an empty requester", async () => {
    const cookie = authenticate();
    const tx = {
      ticket: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    vi.spyOn(prisma, "$transaction").mockImplementation((async (
      callback: (transaction: unknown) => Promise<unknown>
    ) => callback(tx)) as never);

    const response = await request(app)
      .get("/api/dashboard/requester")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.metrics).toEqual({
      openTickets: 0,
      waitingForRequester: 0,
      recentlyUpdated: 0,
      recentlyResolved: 0,
    });
    expect(response.body.lists).toEqual({
      attentionTickets: [],
      recentTickets: [],
      resolvedTickets: [],
    });
  });
});
