import { Role } from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";
import { sessionCookie, sessionUser } from "../helpers/session";

/**
 * API-10 and API-11 from tests.md (AC-08), plus the assignee-list read half of
 * API-12 (AC-09).
 *
 * Same seam as every other Lab 3 API suite: Supertest against the exported
 * app with Prisma stubbed, no database.
 *
 * What this file pins for the staff queue [FR-22, BR-16, D12]: search on
 * number OR summary, the status / category / requested-priority / it-priority
 * / owner filters, sort with a number tiebreak, pagination with metadata, the
 * unfiltered default that keeps unassigned work visible, per-parameter
 * INVALID_QUERY refusals, and the role gate that lets IT Staff and
 * Administrators through while refusing a Requester without leaking content.
 */

beforeEach(() => {
  vi.restoreAllMocks();
});

function authAs(id: number, role: Role = Role.IT_STAFF) {
  vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
    sessionUser({ id, role, mustChangePassword: false })
  );
  return sessionCookie({ id, role });
}

const ASSIGNED_ROW = {
  id: 11,
  number: "TKT-2026-00011",
  summary: "Email client shows certificate warning",
  categoryId: 1,
  requestedPriority: "MEDIUM",
  itPriority: "HIGH",
  status: "OPEN",
  requesterId: 2,
  requester: { id: 2, name: "Busaba Srisawat" },
  ownerId: 9,
  owner: { id: 9, name: "Kittipong Saelim" },
  appearsResolvedAt: null,
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
  updatedAt: new Date("2026-09-02T10:00:00.000Z"),
  category: { name: "Network" },
};

const UNASSIGNED_ROW = {
  id: 12,
  number: "TKT-2026-00012",
  summary: "Cannot connect to campus Wi-Fi in Building 3",
  categoryId: 1,
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  status: "NEW",
  requesterId: 1,
  requester: { id: 1, name: "Anucha Wongchai" },
  ownerId: null,
  owner: null,
  appearsResolvedAt: new Date("2026-09-12T08:00:00.000Z"),
  createdAt: new Date("2026-09-01T09:00:00.000Z"),
  updatedAt: new Date("2026-09-01T09:30:00.000Z"),
  category: { name: "Network" },
};

function stubQueue(rows: unknown[], total: number) {
  vi.spyOn(prisma.ticket, "count").mockResolvedValue(total);
  return vi.spyOn(prisma.ticket, "findMany").mockResolvedValue(rows as never);
}

type SeenQueueArgs = {
  where?: Record<string, unknown>;
  orderBy?: unknown;
  skip?: number;
  take?: number;
};

/** Captures the findMany args for where/orderBy/skip/take assertions. */
function stubQueueCapture(rows: unknown[], total: number): SeenQueueArgs {
  const seen: SeenQueueArgs = {};
  vi.spyOn(prisma.ticket, "count").mockResolvedValue(total);
  vi.spyOn(prisma.ticket, "findMany").mockImplementation((async (args: any) => {
    seen.where = args?.where;
    seen.orderBy = args?.orderBy;
    seen.skip = args?.skip;
    seen.take = args?.take;
    return rows as never;
  }) as any);
  return seen;
}

describe("API-10 queue retrieval (AC-08, FR-22, BR-16)", () => {
  it("answers 401 AUTH_REQUIRED without a session", async () => {
    const res = await request(app).get("/api/staff/tickets");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("refuses a Requester with 403 and leaks no ticket content", async () => {
    const cookie = authAs(1, Role.REQUESTER);
    stubQueue([ASSIGNED_ROW, UNASSIGNED_ROW], 2);

    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", cookie);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: { code: "FORBIDDEN", message: expect.any(String) },
    });
    expect(JSON.stringify(res.body)).not.toContain("TKT-2026-00011");
    expect(JSON.stringify(res.body)).not.toContain("TKT-2026-00012");
    expect(JSON.stringify(res.body)).not.toContain("certificate warning");
  });

  it("lets an Administrator through the same gate as IT Staff (D2)", async () => {
    const cookie = authAs(20, Role.ADMINISTRATOR);
    stubQueue([ASSIGNED_ROW], 1);

    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.tickets).toHaveLength(1);
  });

  it("returns every ticket unfiltered by default, unassigned ones included (D12)", async () => {
    const cookie = authAs(9);
    const seen = stubQueueCapture([ASSIGNED_ROW, UNASSIGNED_ROW], 2);

    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.tickets).toHaveLength(2);
    // The default applies no predicate at all: no status, no owner filter, so
    // the unassigned NEW ticket the staff member came to claim stays visible.
    expect(seen.where?.status).toBeUndefined();
    expect(seen.where?.ownerId).toBeUndefined();
    expect(seen.where?.categoryId).toBeUndefined();
    expect(seen.where?.requestedPriority).toBeUndefined();
    expect(seen.where?.itPriority).toBeUndefined();
    expect(seen.where?.OR).toBeUndefined();
    // Default sort is updatedAt desc with a number tiebreak.
    expect(seen.orderBy).toEqual([{ updatedAt: "desc" }, { number: "desc" }]);
    expect(seen.skip).toBe(0);
    expect(seen.take).toBe(10);
    // Pagination metadata with the default page and page size.
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(10);
    expect(res.body.total).toBe(2);
    expect(res.body.totalPages).toBe(1);
  });

  it("serializes each row with requester, owner-or-null, both priorities and the signal flag", async () => {
    const cookie = authAs(9);
    stubQueue([ASSIGNED_ROW, UNASSIGNED_ROW], 2);

    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.tickets[0]).toEqual({
      id: 11,
      number: "TKT-2026-00011",
      summary: "Email client shows certificate warning",
      categoryId: 1,
      categoryName: "Network",
      requestedPriority: "MEDIUM",
      itPriority: "HIGH",
      status: "OPEN",
      requester: { id: 2, name: "Busaba Srisawat" },
      owner: { id: 9, name: "Kittipong Saelim" },
      appearsResolvedAt: null,
      createdAt: new Date("2026-09-01T10:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-09-02T10:00:00.000Z").toISOString(),
    });
    // Unassigned rows carry an explicit null owner, never a missing key.
    expect(res.body.tickets[1].owner).toBeNull();
    expect(res.body.tickets[1]).toHaveProperty("owner", null);
    // The signal timestamp survives the queue projection (AC-08 row content).
    expect(res.body.tickets[1].appearsResolvedAt).toBe(
      new Date("2026-09-12T08:00:00.000Z").toISOString()
    );
    // No credential or note data of any kind travels with the queue.
    expect(JSON.stringify(res.body)).not.toMatch(
      /passwordHash|tokenVersion|internalnote/i
    );
  });

  it("searches case-insensitively on number OR summary", async () => {
    const cookie = authAs(9);
    const findMany = stubQueue([], 0);

    const res = await request(app)
      .get("/api/staff/tickets?search=wifi")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { number: { contains: "wifi", mode: "insensitive" } },
            { summary: { contains: "wifi", mode: "insensitive" } },
          ],
        }),
      })
    );
  });

  it("applies the status, category and both priority filters", async () => {
    const cookie = authAs(9);
    const findMany = stubQueue([], 0);

    const res = await request(app)
      .get(
        "/api/staff/tickets?status=OPEN&categoryId=3&requestedPriority=HIGH&itPriority=LOW"
      )
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "OPEN",
          categoryId: 3,
          requestedPriority: "HIGH",
          itPriority: "LOW",
        }),
      })
    );
  });

  it("supports the owner filter: mine, unassigned and assigned (BR-16)", async () => {
    const cookie = authAs(9);

    const mineSeen = stubQueueCapture([], 0);
    const mine = await request(app)
      .get("/api/staff/tickets?owner=mine")
      .set("Cookie", cookie);
    expect(mine.status).toBe(200);
    expect(mineSeen.where).toEqual(expect.objectContaining({ ownerId: 9 }));
    vi.restoreAllMocks();
    authAs(9);

    const unassignedSeen = stubQueueCapture([], 0);
    const unassigned = await request(app)
      .get("/api/staff/tickets?owner=unassigned")
      .set("Cookie", cookie);
    expect(unassigned.status).toBe(200);
    expect(unassignedSeen.where).toEqual(
      expect.objectContaining({ ownerId: null })
    );
    vi.restoreAllMocks();
    authAs(9);

    const assignedSeen = stubQueueCapture([], 0);
    const assigned = await request(app)
      .get("/api/staff/tickets?owner=assigned")
      .set("Cookie", cookie);
    expect(assigned.status).toBe(200);
    expect(assignedSeen.where).toEqual(
      expect.objectContaining({ ownerId: { not: null } })
    );
  });

  it("sorts by createdAt or number and pages with metadata", async () => {
    const cookie = authAs(9);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(23);
    const findMany = vi
      .spyOn(prisma.ticket, "findMany")
      .mockResolvedValue([] as never);

    const res = await request(app)
      .get("/api/staff/tickets?sort=createdAt&order=asc&page=2&pageSize=5")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "asc" }, { number: "asc" }],
        skip: 5,
        take: 5,
      })
    );
    expect(res.body).toEqual(
      expect.objectContaining({
        tickets: [],
        page: 2,
        pageSize: 5,
        total: 23,
        totalPages: 5,
      })
    );
  });

  it("sorts by number without a tiebreak of its own", async () => {
    const cookie = authAs(9);
    const findMany = stubQueue([], 0);

    const res = await request(app)
      .get("/api/staff/tickets?sort=number&order=asc")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ number: "asc" }] })
    );
  });

  it("reports an empty queue as zero totals, not a failure", async () => {
    const cookie = authAs(9);
    stubQueue([], 0);

    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        tickets: [],
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      })
    );
  });
});

describe("API-11 queue invalid params (AC-08, BR-16)", () => {
  it("refuses each bad param with 400 INVALID_QUERY naming that param", async () => {
    const cookie = authAs(9);
    const count = vi.spyOn(prisma.ticket, "count");
    const findMany = vi.spyOn(prisma.ticket, "findMany");

    const cases: [string, string][] = [
      ["status=BOGUS", "status"],
      ["categoryId=abc", "categoryId"],
      ["categoryId=0", "categoryId"],
      ["requestedPriority=URGENT", "requestedPriority"],
      ["itPriority=URGENT", "itPriority"],
      ["owner=someone", "owner"],
      ["sort=colour", "sort"],
      ["order=sideways", "order"],
      ["page=0", "page"],
      ["page=abc", "page"],
      ["pageSize=7", "pageSize"],
      ["pageSize=abc", "pageSize"],
      [`search=${"x".repeat(151)}`, "search"],
    ];

    for (const [query, parameter] of cases) {
      const res = await request(app)
        .get(`/api/staff/tickets?${query}`)
        .set("Cookie", cookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY");
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: parameter, parameter }),
        ])
      );
    }
    // Nothing invalid ever reaches the database: no wrong results, no leak.
    expect(count).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });

  it("collects one entry per bad param when several fail together", async () => {
    const cookie = authAs(9);
    const findMany = vi.spyOn(prisma.ticket, "findMany");

    const res = await request(app)
      .get("/api/staff/tickets?status=BOGUS&owner=someone&page=0")
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_QUERY");
    const parameters = res.body.error.details.map(
      (detail: { parameter: string }) => detail.parameter
    );
    expect(parameters).toEqual(
      expect.arrayContaining(["status", "owner", "page"])
    );
    expect(res.body.error.details).toHaveLength(3);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe("API-12 assignee list read half (AC-09, BR-10)", () => {
  it("answers 401 without a session and 403 for a Requester", async () => {
    const anonymous = await request(app).get("/api/staff/assignees");
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe("AUTH_REQUIRED");

    const cookie = authAs(1, Role.REQUESTER);
    const forbidden = await request(app)
      .get("/api/staff/assignees")
      .set("Cookie", cookie);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual({
      error: { code: "FORBIDDEN", message: expect.any(String) },
    });
  });

  it("returns active staff and admins name-ascending, reachable by IT Staff", async () => {
    const cookie = authAs(9, Role.IT_STAFF);
    const findMany = vi.spyOn(prisma.user, "findMany").mockResolvedValue([
      { id: 20, name: "Apinya Ratchada", role: Role.ADMINISTRATOR },
      { id: 9, name: "Kittipong Saelim", role: Role.IT_STAFF },
    ] as never);

    const res = await request(app)
      .get("/api/staff/assignees")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    // Only assignable owners are queried: active IT Staff and Administrators.
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          role: { in: [Role.IT_STAFF, Role.ADMINISTRATOR] },
          isActive: true,
        },
        orderBy: { name: "asc" },
      })
    );
    expect(res.body).toEqual({
      assignees: [
        { id: 20, name: "Apinya Ratchada", role: "ADMINISTRATOR" },
        { id: 9, name: "Kittipong Saelim", role: "IT_STAFF" },
      ],
    });
    // The assignee shape carries no credential material.
    expect(JSON.stringify(res.body)).not.toMatch(
      /passwordHash|tokenVersion|email/i
    );
  });

  it("lets an Administrator reach the same list (D2)", async () => {
    const cookie = authAs(20, Role.ADMINISTRATOR);
    vi.spyOn(prisma.user, "findMany").mockResolvedValue([] as never);

    const res = await request(app)
      .get("/api/staff/assignees")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ assignees: [] });
  });
});
