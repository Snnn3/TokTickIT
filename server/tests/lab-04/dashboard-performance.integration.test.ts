import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus, totalmem } from "node:os";
import { resolve } from "node:path";
import { Prisma, PrismaClient, TicketStatus } from "@prisma/client";
import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createDisposableDatabase } from "../helpers/disposable-database";
import {
  resetDashboardTickets,
  seedDashboardAccounts,
} from "../helpers/dashboard-fixtures";
import { sessionCookie } from "../helpers/session";

let database: Awaited<ReturnType<typeof createDisposableDatabase>> | undefined;
let db: PrismaClient;
let app: Express;
let accounts: Awaited<ReturnType<typeof seedDashboardAccounts>>;
const queries: Prisma.QueryEvent[] = [];

function requesterQueryBreakdown(sql: Prisma.QueryEvent[]) {
  const metricReads = sql.filter(
    ({ query }) =>
      /^SELECT/i.test(query) &&
      /FROM "public"\."Ticket"/.test(query) &&
      /COUNT\s*\(/i.test(query)
  );
  const collectionReads = sql.filter(
    ({ query }) =>
      /^SELECT/i.test(query) &&
      /FROM "public"\."Ticket"/.test(query) &&
      /ORDER BY/i.test(query) &&
      !/COUNT|GROUP BY/i.test(query)
  );
  const standaloneRelationReads = sql.filter(
    ({ query }) => /^SELECT/i.test(query) && /FROM "public"\."User"/.test(query)
  );
  return {
    metricQueries: metricReads.length,
    collectionQueries: collectionReads.length,
    standaloneRelationQueries: standaloneRelationReads.length,
  };
}

beforeAll(async () => {
  database = await createDisposableDatabase();
  process.env.DATABASE_URL = database.url;
  process.env.TOKTICKIT_DISPOSABLE_DATABASE_URL = database.url;
  const instrumented = new PrismaClient({
    datasourceUrl: database.url,
    log: [{ emit: "event", level: "query" }],
  });
  instrumented.$on("query", (query) => queries.push(query));
  db = instrumented;
  accounts = await seedDashboardAccounts(db);
  // Substitute only the database boundary with an instrumented REAL PostgreSQL client.
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

async function populatePerformanceFixture() {
  await db.actionTaken.deleteMany();
  await db.ticket.deleteMany();
  const category = await db.category.findFirstOrThrow();
  const instant = new Date(Date.now() - 60000);
  await db.$executeRaw`
    INSERT INTO "Ticket" ("number", "requesterId", "ownerId", "categoryId", "systemId",
      "summary", "description", "requestedPriority", "itPriority", "status", "createdAt", "updatedAt", "resolvedAt")
    SELECT 'PERF-' || lpad(g::text, 5, '0'), ${accounts.requester.id},
      CASE WHEN g % 3 = 0 THEN NULL WHEN g % 3 = 1 THEN ${accounts.staff.id} ELSE ${accounts.secondStaff.id} END,
      ${category.id}, ${accounts.system.id}, 'Performance ticket ' || g, 'Dashboard scale fixture',
      'MEDIUM'::"TicketPriority", 'HIGH'::"TicketPriority", status,
      ${instant}, ${instant},
      CASE WHEN status IN ('RESOLVED'::"TicketStatus", 'CLOSED'::"TicketStatus") THEN ${instant} ELSE NULL END
    FROM (
      SELECT g,
        (ARRAY['NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','RESOLVED','CLOSED','REOPENED','CANCELLED']::"TicketStatus"[])[1 + ((g-1) % 8)] AS status
      FROM generate_series(1, 10000) AS g
    ) AS fixture
  `;
  await db.$executeRaw`
    INSERT INTO "ActionTaken" ("ticketId", "title", "details", "performedById", "assigneeId",
      "status", "result", "completedAt", "createdAt", "updatedAt")
    SELECT t.id, 'Performance action ' || g, 'Dashboard scale fixture',
      CASE WHEN g % 3 = 0 THEN ${accounts.admin.id} WHEN g % 3 = 1 THEN ${accounts.staff.id} ELSE ${accounts.secondStaff.id} END,
      ${accounts.secondStaff.id},
      (ARRAY['PLANNED','IN_PROGRESS','COMPLETED','CANCELLED']::"ActionStatus"[])[1 + ((g-1) % 4)],
      CASE WHEN (g-1) % 4 = 2 THEN 'Verified' ELSE NULL END,
      CASE WHEN (g-1) % 4 = 2 THEN ${instant} ELSE NULL END, ${instant}, ${instant}
    FROM generate_series(1, 30000) AS g
    JOIN "Ticket" t ON t.number = 'PERF-' || lpad((1 + ((g-1) % 10000))::text, 5, '0')
  `;
  await db.$executeRaw`ANALYZE "Ticket"`;
  await db.$executeRaw`ANALYZE "ActionTaken"`;
}

async function fetchSnapshot(cookie: string) {
  queries.length = 0;
  const start = performance.now();
  const response = await request(app)
    .get("/api/dashboard/staff")
    .set("Cookie", cookie);
  const milliseconds = performance.now() - start;
  const sql = [...queries];
  expect(response.status).toBe(200);
  expect(response.body.lists.recentTickets.length).toBeLessThanOrEqual(5);
  expect(response.body.lists.myRecentActions.length).toBeLessThanOrEqual(5);
  expect(Buffer.byteLength(response.text, "utf8")).toBeLessThanOrEqual(
    64 * 1024
  );
  return { response, milliseconds, sql };
}

async function fetchRequesterSnapshot(cookie: string) {
  queries.length = 0;
  const start = performance.now();
  const response = await request(app)
    .get("/api/dashboard/requester")
    .set("Cookie", cookie);
  const milliseconds = performance.now() - start;
  const sql = [...queries];
  expect(response.status).toBe(200);
  expect(response.body.lists.attentionTickets.length).toBeLessThanOrEqual(5);
  expect(response.body.lists.recentTickets.length).toBeLessThanOrEqual(5);
  expect(response.body.lists.resolvedTickets.length).toBeLessThanOrEqual(5);
  expect(Buffer.byteLength(response.text, "utf8")).toBeLessThanOrEqual(
    64 * 1024
  );
  return { response, milliseconds, sql };
}

describe("P4-01 Staff Dashboard and Issue #60 Requester Dashboard", () => {
  it("scopes requester metrics, honors inclusive seven-day bounds and matches both drill-downs", async () => {
    await db.actionTaken.deleteMany();
    await db.ticket.deleteMany();
    const category = await db.category.findFirstOrThrow();
    const asOf = new Date("2026-10-08T01:00:00.000Z");
    const fixtures = [
      {
        number: "TKT-EDGE-00001",
        summary: "Before the window",
        status: TicketStatus.OPEN,
        updatedAt: new Date("2026-10-01T00:59:59.999Z"),
      },
      {
        number: "TKT-EDGE-00002",
        summary: "At the window start",
        status: TicketStatus.OPEN,
        updatedAt: new Date("2026-10-01T01:00:00.000Z"),
      },
      {
        number: "TKT-EDGE-00003",
        summary: "Waiting for requester",
        status: TicketStatus.WAITING_FOR_REQUESTER,
        updatedAt: new Date("2026-10-07T12:00:00.000Z"),
      },
      {
        number: "TKT-EDGE-00004",
        summary: "At the snapshot",
        status: TicketStatus.OPEN,
        updatedAt: asOf,
      },
      {
        number: "TKT-EDGE-00005",
        summary: "After the snapshot",
        status: TicketStatus.OPEN,
        updatedAt: new Date(asOf.getTime() + 1),
      },
      {
        number: "TKT-EDGE-00006",
        summary: "Resolved inside the window",
        status: TicketStatus.CLOSED,
        updatedAt: new Date("2026-10-04T12:00:00.000Z"),
        resolvedAt: new Date("2026-10-04T11:00:00.000Z"),
      },
      {
        number: "TKT-EDGE-00007",
        summary: "Legacy resolution time is unknown",
        status: TicketStatus.CLOSED,
        updatedAt: new Date("2026-10-05T12:00:00.000Z"),
        resolvedAt: null,
      },
    ];

    for (const fixture of fixtures) {
      await db.ticket.create({
        data: {
          ...fixture,
          description: "Requester dashboard fixed-clock fixture",
          requesterId: accounts.requester.id,
          ownerId: accounts.staff.id,
          categoryId: category.id,
          systemId: accounts.system.id,
          requestedPriority: "MEDIUM",
          itPriority: "HIGH",
          createdAt: new Date("2026-09-01T00:00:00.000Z"),
        },
      });
    }
    await db.ticket.create({
      data: {
        number: "TKT-EDGE-FOREIGN",
        summary: "Another requester ticket",
        description: "Ownership isolation fixture",
        requesterId: accounts.secondRequester.id,
        ownerId: accounts.staff.id,
        categoryId: category.id,
        systemId: accounts.system.id,
        requestedPriority: "MEDIUM",
        itPriority: "HIGH",
        status: TicketStatus.OPEN,
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
        updatedAt: new Date("2026-10-07T12:00:00.000Z"),
      },
    });

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(asOf);
    try {
      const cookie = sessionCookie({
        id: accounts.requester.id,
        role: accounts.requester.role,
      });
      const response = await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", cookie);

      expect(response.status).toBe(200);
      expect(response.body.asOf).toBe(asOf.toISOString());
      expect(response.body.metrics).toEqual({
        openTickets: 5,
        waitingForRequester: 1,
        recentlyUpdated: 5,
        recentlyResolved: 1,
      });
      expect(
        response.body.lists.recentTickets.map(
          (ticket: { number: string }) => ticket.number
        )
      ).toEqual([
        "TKT-EDGE-00004",
        "TKT-EDGE-00003",
        "TKT-EDGE-00007",
        "TKT-EDGE-00006",
        "TKT-EDGE-00002",
      ]);
      expect(
        response.body.lists.resolvedTickets.map(
          (ticket: { number: string }) => ticket.number
        )
      ).toEqual(["TKT-EDGE-00006"]);

      const bounds = {
        from: "2026-10-01T01:00:00.000Z",
        to: asOf.toISOString(),
      };
      const updatedTickets = await request(app)
        .get(
          `/api/tickets?${new URLSearchParams({
            dateField: "updatedAt",
            ...bounds,
          })}`
        )
        .set("Cookie", cookie);
      expect(updatedTickets.status).toBe(200);
      expect(updatedTickets.body.total).toBe(5);
      expect(
        updatedTickets.body.tickets.map(
          (ticket: { number: string }) => ticket.number
        )
      ).toEqual(
        response.body.lists.recentTickets.map(
          (ticket: { number: string }) => ticket.number
        )
      );

      const resolvedTickets = await request(app)
        .get(
          `/api/tickets?${new URLSearchParams({
            statusGroup: "resolved",
            dateField: "resolvedAt",
            ...bounds,
          })}`
        )
        .set("Cookie", cookie);
      expect(resolvedTickets.status).toBe(200);
      expect(resolvedTickets.body.total).toBe(1);
      expect(resolvedTickets.body.tickets[0].number).toBe("TKT-EDGE-00006");
    } finally {
      vi.useRealTimers();
    }
  }, 30000);

  it("keeps older actionable tickets visible when newer terminal tickets exist", async () => {
    await db.actionTaken.deleteMany();
    await db.ticket.deleteMany();
    const category = await db.category.findFirstOrThrow();
    const base = new Date(Date.now() - 60000);
    const fixtures = [
      {
        number: "ACTIONABLE-OLDER",
        summary: "Older actionable ticket",
        status: TicketStatus.OPEN,
        updatedAt: new Date(base.getTime() - 60000),
      },
      {
        number: "ACTIONABLE-NEWER",
        summary: "Newer actionable ticket",
        status: TicketStatus.REOPENED,
        updatedAt: new Date(base.getTime() - 30000),
      },
      ...[
        TicketStatus.RESOLVED,
        TicketStatus.CLOSED,
        TicketStatus.CANCELLED,
        TicketStatus.RESOLVED,
        TicketStatus.CLOSED,
      ].map((status, index) => ({
        number: `TERMINAL-${index + 1}`,
        summary: `Newer terminal ticket ${index + 1}`,
        status,
        updatedAt: new Date(base.getTime() - index * 1000),
      })),
    ];

    for (const fixture of fixtures) {
      await db.ticket.create({
        data: {
          number: fixture.number,
          summary: fixture.summary,
          description: "Actionable recent-ticket regression fixture",
          requesterId: accounts.requester.id,
          ownerId: accounts.staff.id,
          categoryId: category.id,
          systemId: accounts.system.id,
          requestedPriority: "MEDIUM",
          itPriority: "HIGH",
          status: fixture.status,
          createdAt: new Date(fixture.updatedAt.getTime() - 86400000),
          updatedAt: fixture.updatedAt,
        },
      });
    }

    const cookie = sessionCookie({
      id: accounts.staff.id,
      role: accounts.staff.role,
    });
    const dashboard = await request(app)
      .get("/api/dashboard/staff")
      .set("Cookie", cookie);

    expect(dashboard.status).toBe(200);
    expect(
      dashboard.body.lists.recentTickets.map(
        (ticket: { summary: string }) => ticket.summary
      )
    ).toEqual(["Newer actionable ticket", "Older actionable ticket"]);
    const actionableStatuses: TicketStatus[] = [
      TicketStatus.NEW,
      TicketStatus.OPEN,
      TicketStatus.IN_PROGRESS,
      TicketStatus.WAITING_FOR_REQUESTER,
      TicketStatus.REOPENED,
    ];
    expect(
      dashboard.body.lists.recentTickets.every(
        (ticket: { status: TicketStatus }) =>
          actionableStatuses.includes(ticket.status)
      )
    ).toBe(true);

    const bounds = {
      from: new Date(
        new Date(dashboard.body.asOf).getTime() - 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      to: dashboard.body.asOf,
    };
    const drilldown = await request(app)
      .get(
        `/api/staff/tickets?${new URLSearchParams({
          statusGroup: "open",
          dateField: "updatedAt",
          ...bounds,
        })}`
      )
      .set("Cookie", cookie);

    expect(drilldown.status).toBe(200);
    expect(drilldown.body.total).toBe(2);
    expect(
      drilldown.body.tickets.map(
        (ticket: { summary: string }) => ticket.summary
      )
    ).toEqual(
      dashboard.body.lists.recentTickets.map(
        (ticket: { summary: string }) => ticket.summary
      )
    );
  }, 30000);

  it("includes exact seven-day endpoints, excludes one millisecond outside them, and agrees with both drill-downs", async () => {
    await db.actionTaken.deleteMany();
    await db.ticket.deleteMany();
    const category = await db.category.findFirstOrThrow();
    const cases = [
      { name: "before-window", instant: "2026-10-01T00:59:59.999Z" },
      { name: "at-window", instant: "2026-10-01T01:00:00.000Z" },
      { name: "inside-window", instant: "2026-10-07T01:00:00.000Z" },
      { name: "at-snapshot", instant: "2026-10-08T01:00:00.000Z" },
      { name: "future", instant: "2026-10-08T01:00:00.001Z" },
    ];
    for (const fixture of cases) {
      const ticket = await db.ticket.create({
        data: {
          number: `EDGE-${fixture.name}`,
          summary: fixture.name,
          description: "Fixed-clock dashboard fixture",
          requesterId: accounts.requester.id,
          ownerId: accounts.staff.id,
          categoryId: category.id,
          systemId: accounts.system.id,
          requestedPriority: "MEDIUM",
          itPriority: "HIGH",
          status: "OPEN",
          createdAt: new Date("2026-09-01T00:00:00Z"),
          updatedAt: new Date(fixture.instant),
        },
      });
      await db.actionTaken.create({
        data: {
          ticketId: ticket.id,
          title: fixture.name,
          details: "Fixed-clock dashboard fixture",
          performedById: accounts.staff.id,
          assigneeId: accounts.secondStaff.id,
          createdAt: new Date(fixture.instant),
          updatedAt: new Date(fixture.instant),
        },
      });
    }
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-08T01:00:00.000Z"));
    try {
      const cookie = sessionCookie({
        id: accounts.staff.id,
        role: accounts.staff.role,
      });
      const response = await request(app)
        .get("/api/dashboard/staff")
        .set("Cookie", cookie);
      expect(response.status).toBe(200);
      expect(response.body.asOf).toBe("2026-10-08T01:00:00.000Z");
      expect(response.body.metrics).toEqual({
        openTickets: 5,
        unassignedTickets: 0,
        myOwnedTickets: 5,
        myActiveActions: 5,
      });
      expect(
        response.body.lists.recentTickets.map(
          (ticket: { summary: string }) => ticket.summary
        )
      ).toEqual(["at-snapshot", "inside-window", "at-window"]);
      expect(
        response.body.lists.myRecentActions.map(
          (action: { title: string }) => action.title
        )
      ).toEqual(["at-snapshot", "inside-window", "at-window"]);
      const bounds = {
        from: "2026-10-01T01:00:00.000Z",
        to: response.body.asOf,
      };
      const tickets = await request(app)
        .get(
          `/api/staff/tickets?${new URLSearchParams({ statusGroup: "open", dateField: "updatedAt", ...bounds })}`
        )
        .set("Cookie", cookie);
      const actions = await request(app)
        .get(
          `/api/staff/actions?${new URLSearchParams({ performedBy: "me", ...bounds })}`
        )
        .set("Cookie", cookie);
      expect(tickets.status).toBe(200);
      expect(actions.status).toBe(200);
      expect(tickets.body.total).toBe(3);
      expect(actions.body.total).toBe(3);
      expect(
        tickets.body.tickets.map((ticket: { id: number }) => ticket.id)
      ).toEqual(
        response.body.lists.recentTickets.map(
          (ticket: { id: number }) => ticket.id
        )
      );
      expect(
        actions.body.actions.map((action: { id: number }) => action.id)
      ).toEqual(
        response.body.lists.myRecentActions.map(
          (action: { id: number }) => action.id
        )
      );
    } finally {
      vi.useRealTimers();
    }
  }, 30000);

  it("matches independent SQL totals at 10k/30k, stays under latency/size budgets and uses a constant bounded query count", async () => {
    const cookie = sessionCookie({
      id: accounts.staff.id,
      role: accounts.staff.role,
    });
    await resetDashboardTickets(db);
    const small = await fetchSnapshot(cookie);
    await populatePerformanceFixture();
    expect(await db.ticket.count()).toBe(10000);
    expect(await db.actionTaken.count()).toBe(30000);
    const [expected] = await db.$queryRaw<
      {
        openTickets: number;
        unassignedTickets: number;
        myOwnedTickets: number;
        myActiveActions: number;
      }[]
    >`
      SELECT
        (SELECT count(*)::int FROM "Ticket" WHERE status IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')) AS "openTickets",
        (SELECT count(*)::int FROM "Ticket" WHERE status IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED') AND "ownerId" IS NULL) AS "unassignedTickets",
        (SELECT count(*)::int FROM "Ticket" WHERE status IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED') AND "ownerId" = ${accounts.staff.id}) AS "myOwnedTickets",
        (SELECT count(*)::int FROM "ActionTaken" WHERE "performedById" = ${accounts.staff.id} AND status IN ('PLANNED','IN_PROGRESS')) AS "myActiveActions"
    `;
    const expectedGroups = await db.$queryRaw<
      { status: string; count: number }[]
    >`SELECT status::text, count(*)::int AS count FROM "Ticket" GROUP BY status`;
    for (let index = 0; index < 3; index++) await fetchSnapshot(cookie);
    const samples = [];
    let lastSql: Prisma.QueryEvent[] = [];
    for (let index = 0; index < 20; index++) {
      const { response, milliseconds, sql } = await fetchSnapshot(cookie);
      expect(response.body.metrics).toEqual(expected);
      expect(response.body.groupings.ticketsByStatus).toEqual(
        expect.arrayContaining(expectedGroups)
      );
      expect(response.body.groupings.ticketsByStatus).toHaveLength(8);
      expect(sql.length).toBe(small.sql.length);
      expect(sql.length).toBeLessThanOrEqual(16);
      // Prisma's list SELECTs must have a database limit, not application-side slicing.
      const collectionReads = sql.filter(
        ({ query }) =>
          /^SELECT/.test(query) &&
          /FROM "public"\."(?:Ticket|ActionTaken)"/.test(query) &&
          /ORDER BY/i.test(query) &&
          !/COUNT|GROUP BY/i.test(query)
      );
      expect(collectionReads).toHaveLength(2);
      for (const { query } of collectionReads) expect(query).toContain("LIMIT");
      samples.push({
        milliseconds,
        bytes: Buffer.byteLength(response.text, "utf8"),
        queryCount: sql.length,
      });
      lastSql = sql;
    }
    const sorted = samples
      .map((sample) => sample.milliseconds)
      .sort((a, b) => a - b);
    const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
    const plans = [];
    for (const { query, params } of lastSql.filter(({ query }) =>
      /^SELECT/.test(query)
    )) {
      const typedParams = JSON.parse(params).map((value: unknown) =>
        typeof value === "string" && /^\d{4}-\d{2}-\d{2}[ T]/.test(value)
          ? new Date(value)
          : value
      );
      plans.push(
        await db.$queryRawUnsafe(
          `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
          ...typedParams
        )
      );
    }
    const directory = resolve(__dirname, "../../../artifacts/lab-04");
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      resolve(directory, "staff-dashboard-performance.json"),
      `${JSON.stringify(
        {
          testId: "P4-01",
          scope: "Staff endpoint only; Requester coverage belongs to Issue #60",
          measuredAt: new Date().toISOString(),
          commit: execFileSync("git", ["rev-parse", "HEAD"], {
            encoding: "utf8",
          }).trim(),
          workingTreeChanges:
            execFileSync("git", ["status", "--porcelain"], {
              encoding: "utf8",
            }).trim().length > 0,
          runtime: {
            node: process.version,
            postgres: await db.$queryRaw`SELECT version()`,
            cpu: cpus()[0]?.model,
            logicalCpus: cpus().length,
            memoryBytes: totalmem(),
          },
          fixture: { tickets: 10000, actions: 30000 },
          endpoint: "/api/dashboard/staff",
          concurrency: 1,
          warmupRequests: 3,
          measuredRequests: 20,
          p95Milliseconds: p95,
          budgets: {
            p95Milliseconds: 1000,
            responseBytes: 65536,
            maxQueries: 16,
          },
          smallFixtureQueryCount: small.sql.length,
          samples,
          queries: lastSql,
          plans,
        },
        null,
        2
      )}\n`
    );
    expect(p95).toBeLessThanOrEqual(1000);
  }, 120000);

  it("keeps the Requester Dashboard bounded at 10k Tickets with a constant query count and small response", async () => {
    const cookie = sessionCookie({
      id: accounts.requester.id,
      role: accounts.requester.role,
    });
    await resetDashboardTickets(db);
    const small = await fetchRequesterSnapshot(cookie);
    const smallBreakdown = requesterQueryBreakdown(small.sql);
    await populatePerformanceFixture();
    expect(await db.ticket.count()).toBe(10000);
    expect(await db.actionTaken.count()).toBe(30000);

    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const to = new Date();
    const [expected] = await db.$queryRaw<
      {
        openTickets: number;
        waitingForRequester: number;
        recentlyUpdated: number;
        recentlyResolved: number;
      }[]
    >`
      SELECT
        (SELECT count(*)::int FROM "Ticket" WHERE "requesterId" = ${accounts.requester.id} AND status IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')) AS "openTickets",
        (SELECT count(*)::int FROM "Ticket" WHERE "requesterId" = ${accounts.requester.id} AND status = 'WAITING_FOR_REQUESTER') AS "waitingForRequester",
        (SELECT count(*)::int FROM "Ticket" WHERE "requesterId" = ${accounts.requester.id} AND "updatedAt" BETWEEN ${from} AND ${to}) AS "recentlyUpdated",
        (SELECT count(*)::int FROM "Ticket" WHERE "requesterId" = ${accounts.requester.id} AND status IN ('RESOLVED','CLOSED') AND "resolvedAt" BETWEEN ${from} AND ${to}) AS "recentlyResolved"
    `;

    for (let index = 0; index < 3; index += 1) {
      await fetchRequesterSnapshot(cookie);
    }
    const samples = [];
    for (let index = 0; index < 20; index += 1) {
      const { response, milliseconds, sql } =
        await fetchRequesterSnapshot(cookie);
      expect(response.body.metrics).toEqual(expected);
      expect(sql.length).toBeLessThanOrEqual(16);
      const queryBreakdown = requesterQueryBreakdown(sql);
      expect(queryBreakdown.metricQueries).toBe(4);
      expect(queryBreakdown.collectionQueries).toBe(3);
      for (const { query } of sql.filter(
        ({ query }) =>
          /^SELECT/i.test(query) &&
          /FROM "public"\."Ticket"/.test(query) &&
          /ORDER BY/i.test(query) &&
          !/COUNT|GROUP BY/i.test(query)
      )) {
        expect(query).toContain("LIMIT");
      }
      samples.push({
        milliseconds,
        bytes: Buffer.byteLength(response.text, "utf8"),
        queryCount: sql.length,
        ...queryBreakdown,
      });
    }
    const sorted = samples
      .map((sample) => sample.milliseconds)
      .sort((a, b) => a - b);
    const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
    const directory = resolve(__dirname, "../../../artifacts/lab-04");
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      resolve(directory, "requester-dashboard-performance.json"),
      `${JSON.stringify(
        {
          testId: "P4-01",
          scope: "Requester Dashboard endpoint at 10k owned Tickets",
          measuredAt: new Date().toISOString(),
          commit: execFileSync("git", ["rev-parse", "HEAD"], {
            encoding: "utf8",
          }).trim(),
          workingTreeChanges:
            execFileSync("git", ["status", "--porcelain"], {
              encoding: "utf8",
            }).trim().length > 0,
          runtime: {
            node: process.version,
            postgres: await db.$queryRaw`SELECT version()`,
            cpu: cpus()[0]?.model,
            logicalCpus: cpus().length,
            memoryBytes: totalmem(),
          },
          fixture: { tickets: 10000, actions: 30000 },
          endpoint: "/api/dashboard/requester",
          concurrency: 1,
          warmupRequests: 3,
          measuredRequests: 20,
          p95Milliseconds: p95,
          budgets: {
            p95Milliseconds: 1000,
            responseBytes: 65536,
            maxQueries: 16,
          },
          smallFixtureQueryCount: small.sql.length,
          smallFixtureQueryBreakdown: smallBreakdown,
          samples,
        },
        null,
        2
      )}\n`
    );
    expect(p95).toBeLessThanOrEqual(1000);
  }, 120000);
});
