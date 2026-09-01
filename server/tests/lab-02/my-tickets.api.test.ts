import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

describe("GET /api/tickets (A-07..A-12, FR-08, BR-04, BR-19..BR-21)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("A-07: rejects request without X-Requester-Id with 401 AUTH_REQUIRED", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("A-08: returns owned tickets list with pagination envelope and default sort", async () => {
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValue({
      id: 1,
      name: "Anucha Wongchai",
      email: "anucha.wongchai@example.com",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

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
      .set("X-Requester-Id", "1");

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
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValue({
      id: 2,
      name: "Supaporn Srisuk",
      email: "supaporn.s@example.com",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const findManySpy = vi.spyOn(prisma.ticket, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(0);

    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "2");

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
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValue({
      id: 1,
      name: "Anucha Wongchai",
      email: "anucha.wongchai@example.com",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const findManySpy = vi.spyOn(prisma.ticket, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(0);

    const res = await request(app)
      .get("/api/tickets?search=printer")
      .set("X-Requester-Id", "1");

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
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValue({
      id: 1,
      name: "Anucha Wongchai",
      email: "anucha.wongchai@example.com",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const findManySpy = vi.spyOn(prisma.ticket, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(0);

    const res = await request(app)
      .get("/api/tickets?categoryId=2&priority=HIGH&status=NEW")
      .set("X-Requester-Id", "1");

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
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValue({
      id: 1,
      name: "Anucha Wongchai",
      email: "anucha.wongchai@example.com",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const findManySpy = vi.spyOn(prisma.ticket, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(25);

    const res = await request(app)
      .get("/api/tickets?page=2&pageSize=5&sort=createdAt&order=asc")
      .set("X-Requester-Id", "1");

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.pageSize).toBe(5);
    expect(res.body.total).toBe(25);
    expect(res.body.totalPages).toBe(5);

    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        orderBy: [{ createdAt: "asc" }, { number: "desc" }],
      })
    );
  });

  it("A-12: returns 400 INVALID_QUERY on invalid query parameters (AC-16)", async () => {
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValue({
      id: 1,
      name: "Anucha Wongchai",
      email: "anucha.wongchai@example.com",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .get("/api/tickets?pageSize=15&priority=INVALID&page=-1&sort=invalidField")
      .set("X-Requester-Id", "1");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_QUERY");
    expect(res.body.error.details).toBeInstanceOf(Array);
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(3);
  });
});
