import { Role } from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";
import { sessionCookie, sessionUser } from "../helpers/session";

/**
 * Staff ticket operations (issue #40, Lab3-06).
 *
 * API-12/13/14/15/23 + U-02 + API-09 + API-24 write half (AC-09..AC-12,
 * AC-23, AC-24, BR-10/11/13/23/25/26, D2/D11/D16).
 *
 * Same seam as every other Lab 3 API suite: Supertest against the exported
 * app with Prisma stubbed, no database.
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

function authWithUsers(
  authId: number,
  authRole: Role,
  extraUsers: Record<number, { role: Role; isActive: boolean; name?: string }>
) {
  vi.spyOn(prisma.user, "findUnique").mockImplementation((async (args: {
    where?: { id?: number };
  }) => {
    const id = args?.where?.id;
    if (id === authId) {
      return sessionUser({
        id: authId,
        role: authRole,
        mustChangePassword: false,
      }) as never;
    }
    const extra = id !== undefined ? extraUsers[id] : undefined;
    if (extra) {
      return {
        id,
        name: extra.name ?? `User ${id}`,
        email: `user${id}@example.com`,
        role: extra.role,
        isActive: extra.isActive,
        mustChangePassword: false,
        tokenVersion: 0,
        passwordHash: "$2b$10$not-a-real-hash",
        createdAt: new Date("2026-09-01T00:00:00Z"),
        updatedAt: new Date("2026-09-01T00:00:00Z"),
      } as never;
    }
    return null as never;
  }) as never);
  return sessionCookie({ id: authId, role: authRole });
}

const BASE_TICKET = {
  id: 20,
  number: "TKT-2026-00020",
  summary: "VPN disconnects after ten minutes",
  description: "The VPN connects, then drops after about ten minutes.",
  categoryId: 1,
  systemId: 3,
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  status: "OPEN",
  requesterId: 2,
  ownerId: null as number | null,
  owner: null as { id: number; name: string } | null,
  requester: { id: 2, name: "Busaba Srisawat" },
  appearsResolvedAt: null,
  resolutionSummary: null as string | null,
  ticketDate: new Date("2026-09-01T10:00:00.000Z"),
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
  updatedAt: new Date("2026-09-02T10:00:00.000Z"),
  category: { name: "Network" },
  attachments: [],
  publicComments: [],
  internalNotes: [],
};

function stubTicketDetail(overrides: Record<string, unknown> = {}) {
  const row = { ...BASE_TICKET, ...overrides } as never;
  vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(row);
  return row;
}

describe("U-02 transition matrix helper (BR-13, AC-11)", () => {
  it("permits exactly the matrix targets and refuses terminal exits", async () => {
    const { getLegalTargets, isTransitionAllowed } = await import(
      "../../src/utils/transitions"
    );

    expect(getLegalTargets("NEW").sort()).toEqual(["CANCELLED", "OPEN"]);
    expect(getLegalTargets("OPEN").sort()).toEqual([
      "CANCELLED",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
    ]);
    expect(getLegalTargets("IN_PROGRESS").sort()).toEqual([
      "CANCELLED",
      "RESOLVED",
      "WAITING_FOR_REQUESTER",
    ]);
    expect(getLegalTargets("WAITING_FOR_REQUESTER").sort()).toEqual([
      "CANCELLED",
      "IN_PROGRESS",
      "RESOLVED",
    ]);
    expect(getLegalTargets("RESOLVED").sort()).toEqual(["CLOSED", "REOPENED"]);
    expect(getLegalTargets("REOPENED").sort()).toEqual([
      "CANCELLED",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
    ]);
    expect(getLegalTargets("CLOSED")).toEqual([]);
    expect(getLegalTargets("CANCELLED")).toEqual([]);

    expect(isTransitionAllowed("NEW", "OPEN")).toBe(true);
    expect(isTransitionAllowed("NEW", "RESOLVED")).toBe(false);
    expect(isTransitionAllowed("OPEN", "RESOLVED")).toBe(false);
    expect(isTransitionAllowed("CLOSED", "REOPENED")).toBe(false);
    expect(isTransitionAllowed("CANCELLED", "OPEN")).toBe(false);
    expect(isTransitionAllowed("RESOLVED", "REOPENED")).toBe(true);
  });
});

describe("staff detail read (AC-09..AC-11, BR-25 read exemption)", () => {
  it("answers 401 without a session and 403 for a Requester role", async () => {
    const anonymous = await request(app).get("/api/staff/tickets/20");
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe("AUTH_REQUIRED");

    const cookie = authAs(1, Role.REQUESTER);
    stubTicketDetail();
    const forbidden = await request(app)
      .get("/api/staff/tickets/20")
      .set("Cookie", cookie);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual({
      error: { code: "FORBIDDEN", message: expect.any(String) },
    });
    expect(JSON.stringify(forbidden.body)).not.toContain("TKT-2026-00020");
  });

  it("answers 400 for a non-numeric id and 404 for a missing ticket", async () => {
    const cookie = authAs(9);
    const invalid = await request(app)
      .get("/api/staff/tickets/abc")
      .set("Cookie", cookie);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("INVALID_ID");

    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(null);
    const missing = await request(app)
      .get("/api/staff/tickets/999")
      .set("Cookie", cookie);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
  });

  it("returns the full detail with notes for staff on someone else's ticket", async () => {
    const cookie = authAs(9, Role.IT_STAFF);
    stubTicketDetail({
      ownerId: 9,
      owner: { id: 9, name: "Kittipong Saelim" },
      publicComments: [
        {
          id: 1,
          body: "Still broken.",
          author: { id: 2, name: "Busaba Srisawat", role: "REQUESTER" },
          createdAt: new Date("2026-09-11T09:00:00.000Z"),
        },
      ],
      internalNotes: [
        {
          id: 2,
          body: "Checking the VPN concentrator logs.",
          author: { id: 9, name: "Kittipong Saelim", role: "IT_STAFF" },
          createdAt: new Date("2026-09-11T10:00:00.000Z"),
        },
      ],
    });

    const res = await request(app)
      .get("/api/staff/tickets/20")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.ticket.number).toBe("TKT-2026-00020");
    expect(res.body.ticket.requestedPriority).toBe("MEDIUM");
    expect(res.body.ticket.itPriority).toBe("MEDIUM");
    expect(res.body.ticket.requester).toEqual({
      id: 2,
      name: "Busaba Srisawat",
    });
    expect(res.body.ticket.owner).toEqual({ id: 9, name: "Kittipong Saelim" });
    expect(res.body.ticket.publicComments).toHaveLength(1);
    expect(res.body.ticket.internalNotes).toHaveLength(1);
    expect(res.body).not.toHaveProperty("selfService");
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|tokenVersion/);
  });

  it("lets an Administrator through the same detail gate as IT Staff (D2)", async () => {
    const cookie = authAs(20, Role.ADMINISTRATOR);
    stubTicketDetail();
    const res = await request(app)
      .get("/api/staff/tickets/20")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.ticket.id).toBe(20);
  });

  it("still loads a ticket the caller filed, with notes omitted and a selfService marker (BR-25)", async () => {
    const cookie = authAs(2, Role.IT_STAFF);
    stubTicketDetail({
      requesterId: 2,
      requester: { id: 2, name: "Busaba Srisawat" },
      internalNotes: [
        {
          id: 9,
          body: "Secret operational note.",
          author: { id: 9, name: "Kittipong Saelim", role: "IT_STAFF" },
          createdAt: new Date("2026-09-11T10:00:00.000Z"),
        },
      ],
    });

    const res = await request(app)
      .get("/api/staff/tickets/20")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.selfService).toBe(true);
    expect(res.body.ticket).not.toHaveProperty("internalNotes");
    expect(JSON.stringify(res.body)).not.toContain("Secret operational note");
  });
});

describe("API-12 owner claim/assign/reassign (AC-09, BR-10)", () => {
  it("assigns a valid active staff target and persists it", async () => {
    const cookie = authWithUsers(9, Role.IT_STAFF, {
      10: { role: Role.IT_STAFF, isActive: true, name: "Manasporn Thongdee" },
    });
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      status: "OPEN",
      ownerId: null,
    } as never);
    const update = vi.spyOn(prisma.ticket, "update").mockResolvedValue({
      ...BASE_TICKET,
      status: "OPEN",
      ownerId: 10,
      owner: { id: 10, name: "Manasporn Thongdee" },
    } as never);

    const res = await request(app)
      .patch("/api/staff/tickets/20/owner")
      .set("Cookie", cookie)
      .send({ ownerId: 10 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      owner: { id: 10, name: "Manasporn Thongdee" },
      status: "OPEN",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 20 },
        data: expect.objectContaining({ ownerId: 10 }),
      })
    );
  });

  it("lets an Administrator assign as well (D2) and allows unassigning with null", async () => {
    const cookie = authWithUsers(20, Role.ADMINISTRATOR, {});
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      status: "OPEN",
      ownerId: 9,
      owner: { id: 9, name: "Kittipong Saelim" },
    } as never);
    vi.spyOn(prisma.ticket, "update").mockResolvedValue({
      ...BASE_TICKET,
      status: "OPEN",
      ownerId: null,
      owner: null,
    } as never);

    const res = await request(app)
      .patch("/api/staff/tickets/20/owner")
      .set("Cookie", cookie)
      .send({ ownerId: null });

    expect(res.status).toBe(200);
    expect(res.body.owner).toBeNull();
    expect(res.body.status).toBe("OPEN");
  });

  it("rejects an inactive target and a wrong-role target with 422 INVALID_OWNER", async () => {
    const cookie = authWithUsers(9, Role.IT_STAFF, {
      50: { role: Role.IT_STAFF, isActive: false },
      51: { role: Role.REQUESTER, isActive: true },
    });
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
    } as never);
    const update = vi.spyOn(prisma.ticket, "update");

    const inactive = await request(app)
      .patch("/api/staff/tickets/20/owner")
      .set("Cookie", cookie)
      .send({ ownerId: 50 });
    expect(inactive.status).toBe(422);
    expect(inactive.body.error.code).toBe("INVALID_OWNER");

    const wrongRole = await request(app)
      .patch("/api/staff/tickets/20/owner")
      .set("Cookie", cookie)
      .send({ ownerId: 51 });
    expect(wrongRole.status).toBe(422);
    expect(wrongRole.body.error.code).toBe("INVALID_OWNER");

    const unknown = await request(app)
      .patch("/api/staff/tickets/20/owner")
      .set("Cookie", cookie)
      .send({ ownerId: 999 });
    expect(unknown.status).toBe(422);
    expect(unknown.body.error.code).toBe("INVALID_OWNER");

    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a malformed owner body with 400 and a bad ticket id", async () => {
    const cookie = authAs(9);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
    } as never);

    const missing = await request(app)
      .patch("/api/staff/tickets/20/owner")
      .set("Cookie", cookie)
      .send({});
    expect(missing.status).toBe(400);

    const badId = await request(app)
      .patch("/api/staff/tickets/abc/owner")
      .set("Cookie", cookie)
      .send({ ownerId: null });
    expect(badId.status).toBe(400);
    expect(badId.body.error.code).toBe("INVALID_ID");
  });

  it("refuses a Requester role with 403 on the owner route", async () => {
    const cookie = authAs(1, Role.REQUESTER);
    stubTicketDetail();
    const res = await request(app)
      .patch("/api/staff/tickets/20/owner")
      .set("Cookie", cookie)
      .send({ ownerId: null });
    expect(res.status).toBe(403);
  });
});

describe("API-13 claim-auto-open (AC-09, BR-23, D16)", () => {
  it("moves an unowned NEW ticket to OPEN on claim", async () => {
    const cookie = authWithUsers(9, Role.IT_STAFF, {
      9: { role: Role.IT_STAFF, isActive: true, name: "Kittipong Saelim" },
    });
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      status: "NEW",
      ownerId: null,
      owner: null,
    } as never);
    const update = vi.spyOn(prisma.ticket, "update").mockResolvedValue({
      ...BASE_TICKET,
      status: "OPEN",
      ownerId: 9,
      owner: { id: 9, name: "Kittipong Saelim" },
    } as never);

    const res = await request(app)
      .patch("/api/staff/tickets/20/owner")
      .set("Cookie", cookie)
      .send({ ownerId: 9 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OPEN");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: 9, status: "OPEN" }),
      })
    );
  });

  it("leaves the status untouched on claims from other statuses and on reassign/unassign", async () => {
    const cookie = authWithUsers(9, Role.IT_STAFF, {
      9: { role: Role.IT_STAFF, isActive: true, name: "Kittipong Saelim" },
      10: { role: Role.IT_STAFF, isActive: true, name: "Manasporn Thongdee" },
    });

    for (const status of ["OPEN", "IN_PROGRESS", "REOPENED"]) {
      vi.spyOn(prisma.ticket, "findUnique").mockResolvedValueOnce({
        ...BASE_TICKET,
        status,
        ownerId: null,
        owner: null,
      } as never);
      vi.spyOn(prisma.ticket, "update").mockResolvedValueOnce({
        ...BASE_TICKET,
        status,
        ownerId: 9,
        owner: { id: 9, name: "Kittipong Saelim" },
      } as never);

      const res = await request(app)
        .patch("/api/staff/tickets/20/owner")
        .set("Cookie", cookie)
        .send({ ownerId: 9 });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }

    vi.restoreAllMocks();
    authWithUsers(9, Role.IT_STAFF, {
      10: { role: Role.IT_STAFF, isActive: true, name: "Manasporn Thongdee" },
    });
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      status: "OPEN",
      ownerId: 9,
      owner: { id: 9, name: "Kittipong Saelim" },
    } as never);
    const reassign = vi.spyOn(prisma.ticket, "update").mockResolvedValue({
      ...BASE_TICKET,
      status: "OPEN",
      ownerId: 10,
      owner: { id: 10, name: "Manasporn Thongdee" },
    } as never);
    const res = await request(app)
      .patch("/api/staff/tickets/20/owner")
      .set("Cookie", cookie)
      .send({ ownerId: 10 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OPEN");
    expect(reassign).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ status: expect.anything() }),
      })
    );
  });
});

describe("API-14 IT priority (AC-10, BR-11)", () => {
  it("persists a staff IT priority change", async () => {
    const cookie = authAs(9);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
    } as never);
    const update = vi.spyOn(prisma.ticket, "update").mockResolvedValue({
      ...BASE_TICKET,
      itPriority: "HIGH",
    } as never);

    const res = await request(app)
      .patch("/api/staff/tickets/20/priority")
      .set("Cookie", cookie)
      .send({ itPriority: "HIGH" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ itPriority: "HIGH" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 20 },
        data: expect.objectContaining({ itPriority: "HIGH" }),
      })
    );
  });

  it("refuses a Requester with 403 and rejects a bad priority with 400", async () => {
    const requesterCookie = authAs(1, Role.REQUESTER);
    stubTicketDetail();
    const forbidden = await request(app)
      .patch("/api/staff/tickets/20/priority")
      .set("Cookie", requesterCookie)
      .send({ itPriority: "HIGH" });
    expect(forbidden.status).toBe(403);

    const staffCookie = authAs(9);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
    } as never);
    const bad = await request(app)
      .patch("/api/staff/tickets/20/priority")
      .set("Cookie", staffCookie)
      .send({ itPriority: "URGENT" });
    expect(bad.status).toBe(400);
  });

  it("never writes the requested priority, even when the client sends it", async () => {
    const cookie = authAs(9);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      requestedPriority: "MEDIUM",
    } as never);
    const update = vi.spyOn(prisma.ticket, "update").mockResolvedValue({
      ...BASE_TICKET,
      itPriority: "LOW",
    } as never);

    const res = await request(app)
      .patch("/api/staff/tickets/20/priority")
      .set("Cookie", cookie)
      .send({ itPriority: "LOW", requestedPriority: "HIGH" });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          requestedPriority: expect.anything(),
        }),
      })
    );
  });
});

describe("API-15 status transitions (AC-11, BR-13)", () => {
  it("applies a legal transition and clears the appears-resolved signal", async () => {
    const cookie = authAs(9);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      status: "OPEN",
      appearsResolvedAt: new Date("2026-09-12T08:00:00.000Z"),
      resolutionSummary: null,
    } as never);
    const update = vi.spyOn(prisma.ticket, "update").mockResolvedValue({
      ...BASE_TICKET,
      status: "IN_PROGRESS",
      appearsResolvedAt: null,
    } as never);

    const res = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "IN_PROGRESS" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("IN_PROGRESS");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "IN_PROGRESS",
          appearsResolvedAt: null,
        }),
      })
    );
  });

  it("refuses an illegal transition with 422 INVALID_TRANSITION and a reason", async () => {
    const cookie = authAs(9);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      status: "NEW",
    } as never);
    const update = vi.spyOn(prisma.ticket, "update");

    const res = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "RESOLVED" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_TRANSITION");
    expect(res.body.error.message).toMatch(
      /NEW.*RESOLVED|not permitted|illegal/i
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses any transition out of Closed or Cancelled with 422", async () => {
    const cookie = authAs(9);
    const update = vi.spyOn(prisma.ticket, "update");

    for (const from of ["CLOSED", "CANCELLED"]) {
      vi.spyOn(prisma.ticket, "findUnique").mockResolvedValueOnce({
        ...BASE_TICKET,
        status: from,
      } as never);
      const res = await request(app)
        .patch("/api/staff/tickets/20/status")
        .set("Cookie", cookie)
        .send({ status: "OPEN" });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_TRANSITION");
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses a Requester attempting resolve or close with 403", async () => {
    const cookie = authAs(1, Role.REQUESTER);
    stubTicketDetail();
    for (const status of ["RESOLVED", "CLOSED"]) {
      const res = await request(app)
        .patch("/api/staff/tickets/20/status")
        .set("Cookie", cookie)
        .send({ status, resolutionSummary: "Did the work." });
      expect(res.status).toBe(403);
    }
  });

  it("rejects an unknown status value with 400 and an unknown ticket with 404", async () => {
    const cookie = authAs(9);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
    } as never);
    const bad = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "BOGUS" });
    expect(bad.status).toBe(400);

    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(null);
    const missing = await request(app)
      .patch("/api/staff/tickets/999/status")
      .set("Cookie", cookie)
      .send({ status: "OPEN" });
    expect(missing.status).toBe(404);
  });

  it("needs no confirm flag to close or cancel: both succeed without it and ignore it when sent", async () => {
    const cookie = authAs(9);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      status: "RESOLVED",
      resolutionSummary: "Fixed.",
    } as never);
    vi.spyOn(prisma.ticket, "update").mockResolvedValue({
      ...BASE_TICKET,
      status: "CLOSED",
    } as never);

    const plain = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "CLOSED" });
    expect(plain.status).toBe(200);
    expect(plain.body.status).toBe("CLOSED");

    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      status: "RESOLVED",
      resolutionSummary: "Fixed.",
    } as never);
    vi.spyOn(prisma.ticket, "update").mockResolvedValue({
      ...BASE_TICKET,
      status: "CLOSED",
    } as never);
    const withConfirm = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "CLOSED", confirm: true });
    expect(withConfirm.status).toBe(200);
  });
});

describe("API-23 resolution summary (AC-23, BR-26, FR-28, D11)", () => {
  it("requires a summary to resolve: 400 RESOLUTION_SUMMARY_REQUIRED when none is stored or supplied", async () => {
    const cookie = authAs(9);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      status: "IN_PROGRESS",
      resolutionSummary: null,
    } as never);
    const update = vi.spyOn(prisma.ticket, "update");

    const res = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "RESOLVED" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("RESOLUTION_SUMMARY_REQUIRED");
    expect(update).not.toHaveBeenCalled();
  });

  it("resolves with a supplied summary and exposes it on the staff detail", async () => {
    const cookie = authAs(9);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      status: "IN_PROGRESS",
      resolutionSummary: null,
    } as never);
    vi.spyOn(prisma.ticket, "update").mockResolvedValue({
      ...BASE_TICKET,
      status: "RESOLVED",
      resolutionSummary: "Replaced the VPN profile.",
    } as never);

    const res = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({
        status: "RESOLVED",
        resolutionSummary: "  Replaced the VPN profile.  ",
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "RESOLVED",
      resolutionSummary: "Replaced the VPN profile.",
    });
  });

  it("reuses an already-stored summary when none is supplied, and rejects whitespace-only", async () => {
    const cookie = authAs(9);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      status: "IN_PROGRESS",
      resolutionSummary: "Stored explanation.",
    } as never);
    vi.spyOn(prisma.ticket, "update").mockResolvedValue({
      ...BASE_TICKET,
      status: "RESOLVED",
      resolutionSummary: "Stored explanation.",
    } as never);
    const reused = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "RESOLVED" });
    expect(reused.status).toBe(200);

    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      status: "IN_PROGRESS",
      resolutionSummary: null,
    } as never);
    const blank = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "RESOLVED", resolutionSummary: "    " });
    expect(blank.status).toBe(400);
    expect(blank.body.error.code).toBe("RESOLUTION_SUMMARY_REQUIRED");
  });

  it("makes the summary visible to the requester on the own detail", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 2, mustChangePassword: false })
    );
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      requesterId: 2,
      status: "RESOLVED",
      resolutionSummary: "Replaced the VPN profile.",
      requester: { id: 2, name: "Busaba Srisawat" },
      attachments: [],
      publicComments: [],
      appearsResolvedAt: null,
    } as any);
    const res = await request(app)
      .get("/api/tickets/20")
      .set("Cookie", sessionCookie({ id: 2 }));
    expect(res.status).toBe(200);
    expect(res.body.ticket.resolutionSummary).toBe("Replaced the VPN profile.");
  });

  it("clears the summary on a staff reopen so the next cycle needs a fresh one", async () => {
    const cookie = authAs(9);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      status: "RESOLVED",
      resolutionSummary: "First explanation.",
      appearsResolvedAt: new Date("2026-09-12T08:00:00.000Z"),
    } as never);
    const update = vi.spyOn(prisma.ticket, "update").mockResolvedValue({
      ...BASE_TICKET,
      status: "REOPENED",
      resolutionSummary: null,
      appearsResolvedAt: null,
    } as never);

    const res = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "REOPENED" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "REOPENED", resolutionSummary: null });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "REOPENED",
          resolutionSummary: null,
          appearsResolvedAt: null,
        }),
      })
    );
  });
});

describe("API-09 internal notes content and validation (AC-12, FR-25, BR-14)", () => {
  function staffTicket() {
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      requesterId: 2,
    } as never);
  }

  it("serves notes to IT Staff and Administrators alike (D2)", async () => {
    for (const role of [Role.IT_STAFF, Role.ADMINISTRATOR]) {
      vi.restoreAllMocks();
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
        sessionUser({ id: 9, role, mustChangePassword: false })
      );
      staffTicket();
      vi.spyOn(prisma.internalNote, "findMany").mockResolvedValue([
        {
          id: 3,
          body: "Checking the concentrator.",
          author: { id: 9, name: "Kittipong Saelim", role },
          createdAt: new Date("2026-09-11T10:00:00.000Z"),
        },
      ] as never);

      const res = await request(app)
        .get("/api/staff/tickets/20/notes")
        .set("Cookie", sessionCookie({ id: 9, role }));
      expect(res.status).toBe(200);
      expect(res.body.notes).toHaveLength(1);
      expect(res.body.notes[0]).toEqual({
        id: 3,
        body: "Checking the concentrator.",
        author: { id: 9, name: "Kittipong Saelim", role },
        createdAt: new Date("2026-09-11T10:00:00.000Z").toISOString(),
      });
    }
  });

  it("creates a note with the backend-set author and time, trimming the body", async () => {
    const cookie = authAs(9);
    staffTicket();
    const createdAt = new Date("2026-09-12T09:00:00.000Z");
    const create = vi.spyOn(prisma.internalNote, "create").mockResolvedValue({
      id: 8,
      ticketId: 20,
      authorId: 9,
      body: "Escalated to network ops.",
      createdAt,
    } as never);

    const res = await request(app)
      .post("/api/staff/tickets/20/notes")
      .set("Cookie", cookie)
      .send({ body: "   Escalated to network ops.   ", authorId: 99 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: 8,
      body: "Escalated to network ops.",
      author: { id: 9, name: "User 9", role: "IT_STAFF" },
      createdAt: createdAt.toISOString(),
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticketId: 20,
          authorId: 9,
          body: "Escalated to network ops.",
        }),
      })
    );
  });

  it("rejects empty, whitespace-only and over-limit note bodies with 400", async () => {
    const cookie = authAs(9);
    staffTicket();
    const create = vi.spyOn(prisma.internalNote, "create");

    for (const body of ["", "    ", "x".repeat(2001)]) {
      const res = await request(app)
        .post("/api/staff/tickets/20/notes")
        .set("Cookie", cookie)
        .send({ body });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("is append-only: no update or delete route exists", async () => {
    const cookie = authAs(9);
    const put = await request(app)
      .put("/api/staff/tickets/20/notes")
      .set("Cookie", cookie)
      .send({ body: "edit" });
    expect(put.status).toBe(404);
    const del = await request(app)
      .delete("/api/staff/tickets/20/notes")
      .set("Cookie", cookie);
    expect(del.status).toBe(404);
  });

  it("refuses a Requester with 403 and leaks no note content", async () => {
    const cookie = authAs(1, Role.REQUESTER);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
    } as never);

    const read = await request(app)
      .get("/api/staff/tickets/20/notes")
      .set("Cookie", cookie);
    expect(read.status).toBe(403);
    expect(read.body).toEqual({
      error: { code: "FORBIDDEN", message: expect.any(String) },
    });
    expect(JSON.stringify(read.body)).not.toContain("concentrator");

    const write = await request(app)
      .post("/api/staff/tickets/20/notes")
      .set("Cookie", cookie)
      .send({ body: "Trying to write a note." });
    expect(write.status).toBe(403);
    expect(write.body).toEqual({
      error: { code: "FORBIDDEN", message: expect.any(String) },
    });
    expect(write.body).not.toHaveProperty("notes");
    expect(JSON.stringify(write.body)).not.toContain("TKT-2026-00020");
  });
});

describe("API-24 self-service ban (AC-24, BR-25)", () => {
  const ownTicket = {
    ...BASE_TICKET,
    requesterId: 9,
    requester: { id: 9, name: "Kittipong Saelim" },
  };

  function staffOwnsTicket() {
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(ownTicket as never);
  }

  it("refuses claim, priority, status and note writes on a self-filed ticket with 403 SELF_SERVICE_FORBIDDEN", async () => {
    const cookie = authWithUsers(9, Role.IT_STAFF, {
      10: { role: Role.IT_STAFF, isActive: true, name: "Manasporn Thongdee" },
    });
    staffOwnsTicket();
    const update = vi.spyOn(prisma.ticket, "update");
    const noteCreate = vi.spyOn(prisma.internalNote, "create");

    const claim = await request(app)
      .patch("/api/staff/tickets/20/owner")
      .set("Cookie", cookie)
      .send({ ownerId: 10 });
    expect(claim.status).toBe(403);
    expect(claim.body.error.code).toBe("SELF_SERVICE_FORBIDDEN");

    const priority = await request(app)
      .patch("/api/staff/tickets/20/priority")
      .set("Cookie", cookie)
      .send({ itPriority: "HIGH" });
    expect(priority.status).toBe(403);
    expect(priority.body.error.code).toBe("SELF_SERVICE_FORBIDDEN");

    const status = await request(app)
      .patch("/api/staff/tickets/20/status")
      .set("Cookie", cookie)
      .send({ status: "IN_PROGRESS" });
    expect(status.status).toBe(403);
    expect(status.body.error.code).toBe("SELF_SERVICE_FORBIDDEN");

    const note = await request(app)
      .post("/api/staff/tickets/20/notes")
      .set("Cookie", cookie)
      .send({ body: "Own-ticket note." });
    expect(note.status).toBe(403);
    expect(note.body.error.code).toBe("SELF_SERVICE_FORBIDDEN");

    expect(update).not.toHaveBeenCalled();
    expect(noteCreate).not.toHaveBeenCalled();
  });

  it("refuses reading notes on a self-filed ticket exactly like writing them, revealing nothing", async () => {
    const cookie = authAs(9, Role.IT_STAFF);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(ownTicket as never);
    const findMany = vi.spyOn(prisma.internalNote, "findMany");

    const res = await request(app)
      .get("/api/staff/tickets/20/notes")
      .set("Cookie", cookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("SELF_SERVICE_FORBIDDEN");
    expect(res.body).toEqual({
      error: { code: "SELF_SERVICE_FORBIDDEN", message: expect.any(String) },
    });
    expect(findMany).not.toHaveBeenCalled();
    expect(res.body).not.toHaveProperty("notes");
    expect(JSON.stringify(res.body)).not.toContain("TKT-2026-00020");
  });

  it("still lets the filer use requester actions: comment and appears-resolved succeed", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 9, role: Role.IT_STAFF, mustChangePassword: false })
    );
    const cookie = sessionCookie({ id: 9, role: Role.IT_STAFF });
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      id: 20,
      requesterId: 9,
      status: "OPEN",
      appearsResolvedAt: null,
    } as never);
    vi.spyOn(prisma.publicComment, "create").mockResolvedValue({
      id: 77,
      ticketId: 20,
      authorId: 9,
      body: "Extra detail from the filer.",
      createdAt: new Date("2026-09-12T09:00:00.000Z"),
    } as never);
    vi.spyOn(prisma.ticket, "updateMany").mockResolvedValue({
      count: 1,
    } as never);

    const comment = await request(app)
      .post("/api/tickets/20/comments")
      .set("Cookie", cookie)
      .send({ body: "Extra detail from the filer." });
    expect(comment.status).toBe(201);

    const signal = await request(app)
      .post("/api/tickets/20/appears-resolved")
      .set("Cookie", cookie);
    expect(signal.status).toBe(200);
  });

  it("applies the ban to Administrators on their own tickets as well", async () => {
    const cookie = authWithUsers(20, Role.ADMINISTRATOR, {
      10: { role: Role.IT_STAFF, isActive: true },
    });
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...BASE_TICKET,
      requesterId: 20,
    } as never);

    const res = await request(app)
      .patch("/api/staff/tickets/20/priority")
      .set("Cookie", cookie)
      .send({ itPriority: "HIGH" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("SELF_SERVICE_FORBIDDEN");
  });
});

describe("no service-actions surface (out of scope)", () => {
  it("exposes no service-actions route under staff or tickets", async () => {
    const cookie = authAs(9);
    for (const path of [
      "/api/staff/tickets/20/actions",
      "/api/staff/tickets/20/service-actions",
      "/api/tickets/20/actions",
    ]) {
      const res = await request(app).get(path).set("Cookie", cookie);
      expect(res.status).toBe(404);
    }
  });
});
