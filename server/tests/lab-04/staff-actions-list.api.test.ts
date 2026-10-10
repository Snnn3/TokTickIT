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

function authAs(id = ACTOR.id, role: Role = Role.IT_STAFF) {
  vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
    sessionUser({ id, role, mustChangePassword: false })
  );
  return sessionCookie({ id, role });
}

beforeEach(() => vi.restoreAllMocks());

describe("GET /api/staff/actions (API4-04, AC-12, AC-16)", () => {
  it("requires authentication before parsing a GET body", async () => {
    const response = await request(app)
      .get("/api/staff/actions?performedBy=me")
      .set("Content-Type", "application/json")
      .send("{ malformed");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("requires the explicit current-performer scope and applies filters before pagination", async () => {
    const cookie = authAs();
    const action = {
      id: 401,
      ticketId: 31,
      title: "Inspect network logs",
      status: ActionStatus.PLANNED,
      performedBy: ACTOR,
      assignee: null,
      createdAt: new Date("2026-10-08T00:00:00.000Z"),
      updatedAt: new Date("2026-10-08T00:30:00.000Z"),
      version: 2,
      ticket: { number: "TKT-2026-00031" },
    };
    const findMany = vi
      .spyOn(prisma.actionTaken, "findMany")
      .mockResolvedValue([action] as never);
    const count = vi.spyOn(prisma.actionTaken, "count").mockResolvedValue(6);

    const response = await request(app)
      .get(
        "/api/staff/actions?performedBy=me&statusGroup=active&from=2026-10-01T00%3A00%3A00.000Z&to=2026-10-08T00%3A00%3A00.000Z&page=2&pageSize=5"
      )
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      actions: [
        {
          id: 401,
          ticketId: 31,
          ticketNumber: "TKT-2026-00031",
          performedBy: ACTOR,
          assignee: null,
        },
      ],
      page: 2,
      pageSize: 5,
      total: 6,
      totalPages: 2,
    });
    const expectedWhere = {
      performedById: ACTOR.id,
      status: { in: [ActionStatus.PLANNED, ActionStatus.IN_PROGRESS] },
      createdAt: {
        gte: new Date("2026-10-01T00:00:00.000Z"),
        lte: new Date("2026-10-08T00:00:00.000Z"),
      },
    };
    expect(count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 5,
        take: 5,
      })
    );
  });

  it("rejects missing performer scope and unknown query parameters", async () => {
    const cookie = authAs();

    const missing = await request(app)
      .get("/api/staff/actions")
      .set("Cookie", cookie);
    const unknown = await request(app)
      .get("/api/staff/actions?performedBy=me&userId=10")
      .set("Cookie", cookie);

    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("INVALID_QUERY");
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.code).toBe("INVALID_QUERY");
  });

  it.each([
    "performedBy=me&pageSize=7",
    "performedBy=me&from=2026-10-01T00%3A00%3A00Z",
    "performedBy=me&from=2026-10-02T00%3A00%3A00Z&to=2026-10-01T00%3A00%3A00Z",
    "performedBy=me&from=2026-02-30T00%3A00%3A00Z&to=2026-03-01T00%3A00%3A00Z",
  ])("rejects invalid list query %s before reading actions", async (query) => {
    const cookie = authAs();
    const count = vi.spyOn(prisma.actionTaken, "count");

    const response = await request(app)
      .get(`/api/staff/actions?${query}`)
      .set("Cookie", cookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_QUERY");
    expect(count).not.toHaveBeenCalled();
  });

  it("refuses Requesters without querying actions", async () => {
    const cookie = authAs(2, Role.REQUESTER);
    const count = vi.spyOn(prisma.actionTaken, "count");

    const response = await request(app)
      .get("/api/staff/actions?performedBy=me")
      .set("Cookie", cookie);

    expect(response.status).toBe(403);
    expect(count).not.toHaveBeenCalled();
  });
});
