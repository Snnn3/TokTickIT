import { Role } from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";
import { sessionCookie, sessionUser } from "../helpers/session";

/**
 * API-07, API-08 (read parts), API-22, API-24 (read parts) and API-25 from
 * tests.md (AC-04, AC-05 read path, AC-22, AC-24 read half, AC-25).
 *
 * Every test drives the exported Express app through Supertest with the Prisma
 * client stubbed -- the Lab 2 seam reused unchanged, so no database is needed.
 *
 * Two halves are deliberately NOT here. The SELF_SERVICE_FORBIDDEN guards
 * (API-24 write half) live behind `/api/staff/*`, which does not exist until
 * the staff-operations slice (#40) creates it -- a requester hitting those
 * paths today gets the unknown-route 404, never staff behaviour. API-09
 * (staff/admin note content) lands with the same slice; what this file pins
 * for notes is the read path #38 owns: a requester detail never carries note
 * data of any kind (AC-05, BR-04).
 */

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("API-07 authenticated identity beats any client-supplied id (AC-04)", () => {
  it("ignores a query requesterId and the retired header on the own list", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false })
    );
    const findMany = vi
      .spyOn(prisma.ticket, "findMany")
      .mockResolvedValue([] as never);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(0);

    const res = await request(app)
      .get("/api/tickets?requesterId=2")
      .set("Cookie", sessionCookie({ id: 1 }))
      .set("X-Requester-Id", "2");

    expect(res.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ requesterId: 1 }),
      })
    );
  });

  it("ignores a body requesterId when filing and attributes the ticket to the session", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false })
    );
    const ticketCreate = vi.fn().mockResolvedValue({
      id: 10,
      number: "TKT-2026-00010",
      ticketDate: new Date("2026-09-01T10:00:00.000Z"),
      status: "NEW",
      requestedPriority: "MEDIUM",
      summary: "Cannot connect to campus Wi-Fi",
      description: "My laptop keeps dropping connection in building 3.",
      categoryId: 1,
      systemId: 2,
    });
    vi.spyOn(prisma, "$transaction").mockImplementation(
      async (callback: any) => {
        const txMock = {
          category: {
            findFirst: vi
              .fn()
              .mockResolvedValue({ id: 1, name: "Network", isActive: true }),
          },
          relatedSystem: {
            findFirst: vi.fn().mockResolvedValue({
              id: 2,
              name: "Campus Wi-Fi",
              isActive: true,
            }),
          },
          $queryRaw: vi.fn().mockResolvedValue([{ seq: 10n }]),
          ticket: { create: ticketCreate },
          attachment: { create: vi.fn() },
        };
        return callback(txMock);
      }
    );

    const res = await request(app)
      .post("/api/tickets")
      .set("Cookie", sessionCookie({ id: 1 }))
      .field("summary", "Cannot connect to campus Wi-Fi")
      .field(
        "description",
        "My laptop keeps dropping connection in building 3."
      )
      .field("categoryId", "1")
      .field("systemId", "2")
      .field("requestedPriority", "MEDIUM")
      .field("requesterId", "2");

    expect(res.status).toBe(201);
    expect(res.body.ticket.requester.id).toBe(1);
    expect(ticketCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requesterId: 1 }),
      })
    );
  });

  it("still serves the own detail when a foreign query requesterId is supplied", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false })
    );
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      id: 10,
      number: "TKT-2026-00010",
      summary: "Cannot access network drive",
      description: "Getting permission denied on Z: drive",
      categoryId: 1,
      systemId: 2,
      requestedPriority: "MEDIUM",
      status: "NEW",
      requesterId: 1,
      ticketDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      requester: { id: 1, name: "Anucha Wongchai" },
      attachments: [],
    } as any);

    const res = await request(app)
      .get("/api/tickets/10?requesterId=2")
      .set("Cookie", sessionCookie({ id: 1 }));

    expect(res.status).toBe(200);
    expect(res.body.ticket.requester.id).toBe(1);
  });
});

describe("API-08 cross-user access rejected without an existence leak (AC-04, AC-05 read path)", () => {
  it("answers 403 with the bare envelope for another user's ticket, 404 for a missing one", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false })
    );

    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValueOnce({
      id: 10,
      number: "TKT-2026-00010",
      requesterId: 2,
    } as any);
    const forbidden = await request(app)
      .get("/api/tickets/10")
      .set("Cookie", sessionCookie({ id: 1 }));

    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toEqual({
      error: { code: "FORBIDDEN", message: "Access denied" },
    });
    // No ticket field of any kind leaks through the refusal.
    expect(JSON.stringify(forbidden.body)).not.toContain("TKT-2026-00010");

    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValueOnce(null);
    const missing = await request(app)
      .get("/api/tickets/999")
      .set("Cookie", sessionCookie({ id: 1 }));

    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
  });

  it("answers 403 with no attachment data for another user's attachment", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false })
    );
    vi.spyOn(prisma.attachment, "findUnique").mockResolvedValue({
      id: 201,
      ticketId: 10,
      filename: "secret-plan.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1500,
      data: Buffer.from("someone else's bytes"),
      uploadedAt: new Date(),
      removedAt: null,
      removedReason: null,
      ticket: { requesterId: 2 },
    } as any);

    for (const path of [
      "/api/attachments/201",
      "/api/attachments/201/download",
    ]) {
      const res = await request(app)
        .get(path)
        .set("Cookie", sessionCookie({ id: 1 }));
      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: { code: "FORBIDDEN", message: "Access denied" },
      });
      expect(JSON.stringify(res.body)).not.toContain("secret-plan.pdf");
    }

    vi.spyOn(prisma.attachment, "findUnique").mockResolvedValue(null);
    const missing = await request(app)
      .get("/api/attachments/999")
      .set("Cookie", sessionCookie({ id: 1 }));
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
  });

  it("never carries internal notes on the requester detail, whatever the ticket holds (AC-05, BR-04 read path)", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false })
    );
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      id: 10,
      number: "TKT-2026-00010",
      summary: "Cannot access network drive",
      description: "Getting permission denied on Z: drive",
      categoryId: 1,
      systemId: 2,
      requestedPriority: "MEDIUM",
      status: "NEW",
      requesterId: 1,
      ticketDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      requester: { id: 1, name: "Anucha Wongchai" },
      attachments: [],
      publicComments: [],
      appearsResolvedAt: null,
      resolutionSummary: null,
    } as any);

    const res = await request(app)
      .get("/api/tickets/10")
      .set("Cookie", sessionCookie({ id: 1 }));

    expect(res.status).toBe(200);
    expect(res.body.ticket).not.toHaveProperty("internalNotes");
    expect(res.body.ticket).not.toHaveProperty("notes");
    expect(JSON.stringify(res.body)).not.toMatch(/internalnote/i);
  });
});

describe("API-22 requester reopen (AC-22, BR-13)", () => {
  const resolvedTicket = {
    id: 5,
    requesterId: 1,
    status: "RESOLVED",
    appearsResolvedAt: new Date("2026-09-10T10:00:00.000Z"),
    resolutionSummary: "Rebooted the server.",
  };

  it("reopens the own Resolved ticket and clears the signal and the summary (BR-26)", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false })
    );
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...resolvedTicket,
    } as any);
    const update = vi.spyOn(prisma.ticket, "update").mockResolvedValue({
      ...resolvedTicket,
      status: "REOPENED",
      appearsResolvedAt: null,
      resolutionSummary: null,
    } as any);

    const res = await request(app)
      .post("/api/tickets/5/reopen")
      .set("Cookie", sessionCookie({ id: 1 }))
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "REOPENED" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({
          status: "REOPENED",
          appearsResolvedAt: null,
          resolutionSummary: null,
        }),
      })
    );
  });

  it("refuses another user's Resolved ticket with 403 and changes nothing", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false })
    );
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...resolvedTicket,
      requesterId: 2,
    } as any);
    const update = vi.spyOn(prisma.ticket, "update");

    const res = await request(app)
      .post("/api/tickets/5/reopen")
      .set("Cookie", sessionCookie({ id: 1 }))
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses a reopen from Closed -- and from any other non-Resolved status -- with 422", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false })
    );
    const update = vi.spyOn(prisma.ticket, "update");

    for (const status of ["CLOSED", "CANCELLED", "OPEN", "NEW", "REOPENED"]) {
      vi.spyOn(prisma.ticket, "findUnique").mockResolvedValueOnce({
        ...resolvedTicket,
        status,
      } as any);

      const res = await request(app)
        .post("/api/tickets/5/reopen")
        .set("Cookie", sessionCookie({ id: 1 }))
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_TRANSITION");
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown ticket and 400 for a non-numeric id", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false })
    );
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(null);

    const missing = await request(app)
      .post("/api/tickets/999/reopen")
      .set("Cookie", sessionCookie({ id: 1 }))
      .send({});
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");

    const invalid = await request(app)
      .post("/api/tickets/abc/reopen")
      .set("Cookie", sessionCookie({ id: 1 }))
      .send({});
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("INVALID_ID");
  });
});

describe("API-24 read half: a staff user keeps every requester capability on their own tickets (AC-24, BR-25)", () => {
  // The write half -- 403 SELF_SERVICE_FORBIDDEN on claim, priority, status
  // and notes for a ticket the caller filed -- is owned by #40 together with
  // the `/api/staff/*` routes it guards. What this slice pins is the sentence
  // that follows it: "their Requester actions on the same ticket still
  // succeed", which must already hold on the requester routes below.
  it("lets an IT_STAFF user file, list and read their own tickets", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 9, role: Role.IT_STAFF, mustChangePassword: false })
    );
    const staffCookie = sessionCookie({ id: 9, role: Role.IT_STAFF });

    const ticketCreate = vi.fn().mockResolvedValue({
      id: 30,
      number: "TKT-2026-00030",
      ticketDate: new Date("2026-09-01T10:00:00.000Z"),
      status: "NEW",
      requestedPriority: "LOW",
      summary: "My monitor flickers",
      description: "The staff member's own monitor flickers.",
      categoryId: 1,
      systemId: 2,
    });
    vi.spyOn(prisma, "$transaction").mockImplementation(
      async (callback: any) => {
        const txMock = {
          category: {
            findFirst: vi
              .fn()
              .mockResolvedValue({ id: 1, name: "Hardware", isActive: true }),
          },
          relatedSystem: {
            findFirst: vi.fn().mockResolvedValue({
              id: 2,
              name: "Workstation",
              isActive: true,
            }),
          },
          $queryRaw: vi.fn().mockResolvedValue([{ seq: 30n }]),
          ticket: { create: ticketCreate },
          attachment: { create: vi.fn() },
        };
        return callback(txMock);
      }
    );

    const created = await request(app)
      .post("/api/tickets")
      .set("Cookie", staffCookie)
      .field("summary", "My monitor flickers")
      .field("description", "The staff member's own monitor flickers.")
      .field("categoryId", "1")
      .field("systemId", "2")
      .field("requestedPriority", "LOW");
    expect(created.status).toBe(201);
    expect(created.body.ticket.requester.id).toBe(9);

    const findMany = vi
      .spyOn(prisma.ticket, "findMany")
      .mockResolvedValue([] as never);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(0);
    const listed = await request(app)
      .get("/api/tickets")
      .set("Cookie", staffCookie);
    expect(listed.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ requesterId: 9 }),
      })
    );

    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      id: 30,
      number: "TKT-2026-00030",
      summary: "My monitor flickers",
      description: "The staff member's own monitor flickers.",
      categoryId: 1,
      systemId: 2,
      requestedPriority: "LOW",
      status: "NEW",
      requesterId: 9,
      ticketDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      requester: { id: 9, name: "Kittipong Saelim" },
      attachments: [],
    } as any);
    const read = await request(app)
      .get("/api/tickets/30")
      .set("Cookie", staffCookie);
    expect(read.status).toBe(200);
  });
});

describe("API-25 any authenticated role may file and manage own tickets (AC-25, FR-27)", () => {
  it.each([Role.IT_STAFF, Role.ADMINISTRATOR])(
    "lets a %s user file a ticket that lands in their own list",
    async (role) => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
        sessionUser({ id: 21, role, mustChangePassword: false })
      );
      const cookie = sessionCookie({ id: 21, role });

      const ticketCreate = vi.fn().mockResolvedValue({
        id: 31,
        number: "TKT-2026-00031",
        ticketDate: new Date("2026-09-01T10:00:00.000Z"),
        status: "NEW",
        requestedPriority: "HIGH",
        summary: "Admin VPN token expired",
        description: "My own admin VPN token expired this morning.",
        categoryId: 1,
        systemId: 2,
      });
      vi.spyOn(prisma, "$transaction").mockImplementation(
        async (callback: any) => {
          const txMock = {
            category: {
              findFirst: vi
                .fn()
                .mockResolvedValue({ id: 1, name: "Network", isActive: true }),
            },
            relatedSystem: {
              findFirst: vi.fn().mockResolvedValue({
                id: 2,
                name: "Corporate VPN",
                isActive: true,
              }),
            },
            $queryRaw: vi.fn().mockResolvedValue([{ seq: 31n }]),
            ticket: { create: ticketCreate },
            attachment: { create: vi.fn() },
          };
          return callback(txMock);
        }
      );

      const created = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookie)
        .field("summary", "Admin VPN token expired")
        .field("description", "My own admin VPN token expired this morning.")
        .field("categoryId", "1")
        .field("systemId", "2")
        .field("requestedPriority", "HIGH");

      expect(created.status).toBe(201);
      expect(created.body.ticket.requester.id).toBe(21);

      const findMany = vi
        .spyOn(prisma.ticket, "findMany")
        .mockResolvedValue([] as never);
      vi.spyOn(prisma.ticket, "count").mockResolvedValue(0);
      const listed = await request(app)
        .get("/api/tickets")
        .set("Cookie", cookie);
      expect(listed.status).toBe(200);
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ requesterId: 21 }),
        })
      );
    }
  );
});
