import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";
import { sessionCookie, sessionUser } from "../helpers/session";

describe("GET /api/tickets (A-07..A-12, FR-08, BR-04, BR-19..BR-21)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("A-07: rejects request without a session cookie with 401 AUTH_REQUIRED", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("A-08: returns owned tickets list with pagination envelope and default sort", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({
        id: 1,
        name: "Anucha Wongchai",
        email: "anucha.wongchai@example.com",
      })
    );

    const mockTickets = [
      {
        id: 10,
        number: "TKT-2026-00010",
        summary: "Wi-Fi disconnected",
        categoryId: 1,
        systemId: 2,
        requestedPriority: "HIGH",
        status: "NEW",
        ticketDate: new Date("2026-09-01T10:00:00Z"),
        createdAt: new Date("2026-09-01T10:00:00Z"),
        updatedAt: new Date("2026-09-01T10:00:00Z"),
        category: { name: "Network" },
        system: { name: "Campus Wi-Fi" },
      },
    ];

    vi.spyOn(prisma.ticket, "count").mockResolvedValue(1);
    vi.spyOn(prisma.ticket, "findMany").mockResolvedValue(mockTickets as any);

    const res = await request(app)
      .get("/api/tickets")
      .set("Cookie", sessionCookie(1));

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(10);
    expect(res.body.total).toBe(1);
    expect(res.body.totalPages).toBe(1);
    expect(res.body.tickets).toHaveLength(1);
    expect(res.body.tickets[0].number).toBe("TKT-2026-00010");
    expect(res.body.tickets[0].categoryName).toBe("Network");
    expect(res.body.tickets[0].systemName).toBeUndefined();
  });

  it("A-08b: enforces requester isolation (BR-04, AC-18: Requester B never sees Requester A's tickets)", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({
        id: 2,
        name: "Supaporn Srisuk",
        email: "supaporn.s@example.com",
      })
    );

    const findManySpy = vi
      .spyOn(prisma.ticket, "findMany")
      .mockResolvedValue([]);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(0);

    const res = await request(app)
      .get("/api/tickets")
      .set("Cookie", sessionCookie(2));

    expect(res.status).toBe(200);
    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          requesterId: 2,
        }),
      })
    );
  });

  it("A-09: supports search query across ticket number and summary (BR-19)", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({
        id: 1,
        name: "Anucha Wongchai",
        email: "anucha.wongchai@example.com",
      })
    );

    const findManySpy = vi
      .spyOn(prisma.ticket, "findMany")
      .mockResolvedValue([]);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(0);

    const res = await request(app)
      .get("/api/tickets?search=printer")
      .set("Cookie", sessionCookie(1));

    expect(res.status).toBe(200);
    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          requesterId: 1,
          OR: [
            { number: { contains: "printer", mode: "insensitive" } },
            { summary: { contains: "printer", mode: "insensitive" } },
          ],
        }),
      })
    );
  });

  it("A-10: supports category, priority, and status filters (BR-20)", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({
        id: 1,
        name: "Anucha Wongchai",
        email: "anucha.wongchai@example.com",
      })
    );

    const findManySpy = vi
      .spyOn(prisma.ticket, "findMany")
      .mockResolvedValue([]);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(0);

    const res = await request(app)
      .get("/api/tickets?categoryId=2&priority=HIGH&status=NEW")
      .set("Cookie", sessionCookie(1));

    expect(res.status).toBe(200);
    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          requesterId: 1,
          categoryId: 2,
          requestedPriority: "HIGH",
          status: "NEW",
        }),
      })
    );
  });

  it("A-11: supports custom pagination and sorting (BR-20, BR-21)", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({
        id: 1,
        name: "Anucha Wongchai",
        email: "anucha.wongchai@example.com",
      })
    );

    const findManySpy = vi
      .spyOn(prisma.ticket, "findMany")
      .mockResolvedValue([]);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(25);

    const res = await request(app)
      .get("/api/tickets?page=2&pageSize=5&sort=createdAt&order=asc")
      .set("Cookie", sessionCookie(1));

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.pageSize).toBe(5);
    expect(res.body.total).toBe(25);
    expect(res.body.totalPages).toBe(5);

    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        orderBy: [{ createdAt: "asc" }, { number: "asc" }],
      })
    );
  });

  it("A-12: returns 400 INVALID_QUERY on invalid query parameters including malformed integers (AC-16)", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({
        id: 1,
        name: "Anucha Wongchai",
        email: "anucha.wongchai@example.com",
      })
    );

    const res = await request(app)
      .get(
        "/api/tickets?pageSize=15&priority=INVALID&page=2.5&categoryId=1abc&sort=invalidField"
      )
      .set("Cookie", sessionCookie(1));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_QUERY");
    expect(res.body.error.details).toBeInstanceOf(Array);
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(4);
  });

  it("applies owned status-group and inclusive date filters with stable dashboard ordering", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false })
    );
    const findMany = vi.spyOn(prisma.ticket, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(0);
    const from = "2026-10-01T01:00:00.000Z";
    const to = "2026-10-08T01:00:00.000Z";

    const response = await request(app)
      .get(
        `/api/tickets?${new URLSearchParams({
          statusGroup: "resolved",
          dateField: "resolvedAt",
          from,
          to,
        })}`
      )
      .set("Cookie", sessionCookie(1));

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          requesterId: 1,
          status: { in: ["RESOLVED", "CLOSED"] },
          resolvedAt: { gte: new Date(from), lte: new Date(to) },
        },
        orderBy: [{ resolvedAt: "desc" }, { id: "desc" }],
      })
    );
  });

  it("accepts an explicit sort matching the resolved-time drill-down ordering", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false })
    );
    const findMany = vi.spyOn(prisma.ticket, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(0);

    const response = await request(app)
      .get(
        `/api/tickets?${new URLSearchParams({
          statusGroup: "resolved",
          dateField: "resolvedAt",
          from: "2026-10-01T01:00:00.000Z",
          to: "2026-10-08T01:00:00.000Z",
          sort: "resolvedAt",
          order: "desc",
        })}`
      )
      .set("Cookie", sessionCookie(1));

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ resolvedAt: "desc" }, { id: "desc" }],
      })
    );
  });

  it.each([
    "statusGroup=open&status=NEW",
    "dateField=updatedAt&from=2026-10-01T01%3A00%3A00.000Z",
    "dateField=createdAt&from=2026-10-01T01%3A00%3A00.000Z&to=2026-10-08T01%3A00%3A00.000Z",
    "dateField=updatedAt&from=2026-10-08T01%3A00%3A00.000Z&to=2026-10-01T01%3A00%3A00.000Z",
    "dateField=updatedAt&from=2026-10-01T01%3A00%3A00.000Z&to=2026-10-08T01%3A00%3A00.000Z&order=asc",
    "dateField=resolvedAt&from=2026-10-01T01%3A00%3A00.000Z&to=2026-10-08T01%3A00%3A00.000Z&sort=updatedAt",
    "dateField=resolvedAt&from=2026-10-01T01%3A00%3A00.000Z&to=2026-10-08T01%3A00%3A00.000Z&sort=resolvedAt&order=asc",
    "sort=resolvedAt",
  ])("rejects malformed dashboard drill-down query %s", async (query) => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false })
    );
    const count = vi.spyOn(prisma.ticket, "count");

    const response = await request(app)
      .get(`/api/tickets?${query}`)
      .set("Cookie", sessionCookie(1));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_QUERY");
    expect(count).not.toHaveBeenCalled();
  });
});
