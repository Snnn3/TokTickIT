import { Role } from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";
import { sessionCookie, sessionUser } from "../helpers/session";

/**
 * API-16 and API-17 from tests.md (AC-07, AC-12, FR-21, FR-25, BR-05, BR-14).
 *
 * Same seam as every other Lab 3 API suite: Supertest against the exported
 * app with Prisma stubbed, no database.
 *
 * API-09 (staff/admin note content, D2) is NOT here: notes live behind
 * `/api/staff/tickets/:id/notes`, which the staff-operations slice (#40)
 * creates together with the self-service guard. This file is where #40
 * extends coverage -- the public-comment shapes below are deliberately the
 * same shapes notes will use, so the note tests can mirror these cases.
 */

beforeEach(() => {
  vi.restoreAllMocks();
});

const OWN_OPEN_TICKET = {
  id: 7,
  requesterId: 1,
  status: "OPEN",
  appearsResolvedAt: null,
  resolutionSummary: null,
};

function authAs(id: number, role: Role = Role.REQUESTER) {
  vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
    sessionUser({ id, role, mustChangePassword: false })
  );
  return sessionCookie({ id, role });
}

describe("API-16 appears-resolved signal (AC-07, BR-05, D3)", () => {
  it("sets appearsResolvedAt on the own ticket and changes nothing else", async () => {
    const cookie = authAs(1);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...OWN_OPEN_TICKET,
    } as any);
    const updateMany = vi
      .spyOn(prisma.ticket, "updateMany")
      .mockResolvedValue({ count: 1 } as any);

    const res = await request(app)
      .post("/api/tickets/7/appears-resolved")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(typeof res.body.appearsResolvedAt).toBe("string");
    // The signal never changes status: the write touches the timestamp alone,
    // and the ownership plus expected state travel in the WHERE atomically.
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 7,
          requesterId: 1,
          appearsResolvedAt: null,
        }),
        data: { appearsResolvedAt: expect.any(Date) },
      })
    );
    expect(updateMany.mock.calls[0][0].data).not.toHaveProperty("status");
  });

  it("accepts an explicit empty JSON body the same way as no body at all", async () => {
    const cookie = authAs(1);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...OWN_OPEN_TICKET,
    } as any);
    vi.spyOn(prisma.ticket, "updateMany").mockResolvedValue({
      count: 1,
    } as any);

    const res = await request(app)
      .post("/api/tickets/7/appears-resolved")
      .set("Cookie", cookie)
      .send({});

    expect(res.status).toBe(200);
    expect(typeof res.body.appearsResolvedAt).toBe("string");
  });

  it("refuses a repeat signal with 409 ALREADY_SIGNALLED until it is cleared", async () => {
    const cookie = authAs(1);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...OWN_OPEN_TICKET,
      appearsResolvedAt: new Date("2026-09-12T08:00:00.000Z"),
    } as any);
    const updateMany = vi.spyOn(prisma.ticket, "updateMany");

    const res = await request(app)
      .post("/api/tickets/7/appears-resolved")
      .set("Cookie", cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_SIGNALLED");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("refuses another user's ticket with 403 and changes nothing", async () => {
    const cookie = authAs(1);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...OWN_OPEN_TICKET,
      requesterId: 2,
    } as any);
    const updateMany = vi.spyOn(prisma.ticket, "updateMany");

    const res = await request(app)
      .post("/api/tickets/7/appears-resolved")
      .set("Cookie", cookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("refuses a Closed or Cancelled ticket with 422", async () => {
    const cookie = authAs(1);
    const updateMany = vi.spyOn(prisma.ticket, "updateMany");

    for (const status of ["CLOSED", "CANCELLED"]) {
      vi.spyOn(prisma.ticket, "findUnique").mockResolvedValueOnce({
        ...OWN_OPEN_TICKET,
        status,
      } as any);

      const res = await request(app)
        .post("/api/tickets/7/appears-resolved")
        .set("Cookie", cookie);

      expect(res.status).toBe(422);
    }
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown ticket and 400 for a non-numeric id", async () => {
    const cookie = authAs(1);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(null);

    const missing = await request(app)
      .post("/api/tickets/999/appears-resolved")
      .set("Cookie", cookie);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");

    const invalid = await request(app)
      .post("/api/tickets/abc/appears-resolved")
      .set("Cookie", cookie);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("INVALID_ID");
  });
});

describe("API-16 atomic signal regression (AC-07, ALREADY_SIGNALLED)", () => {
  it("admits two parallel signals but only one wins: the loser sees 409 ALREADY_SIGNALLED", async () => {
    // Both requests read the same stale pre-check state (OPEN, unsignalled),
    // exactly the TOCTOU window the old findUnique-then-update let through.
    // The stub cannot interleave real I/O, so the first two reads are pinned
    // stale (parallel admission, cf. the login-throttle parallel test) while
    // the loser's re-read observes the winner's signal. The conditional
    // updateMany serialises them: first count 1, second count 0.
    const cookie = authAs(1);
    const signalledAt = new Date("2026-09-12T08:00:00.000Z");
    let reads = 0;
    let writes = 0;
    vi.spyOn(prisma.ticket, "findUnique").mockImplementation((async () => {
      reads += 1;
      if (reads <= 2) {
        return { ...OWN_OPEN_TICKET } as any;
      }
      return { ...OWN_OPEN_TICKET, appearsResolvedAt: signalledAt } as any;
    }) as any);
    const updateMany = vi
      .spyOn(prisma.ticket, "updateMany")
      .mockImplementation((async () => {
        writes += 1;
        return { count: writes === 1 ? 1 : 0 } as any;
      }) as any);

    const [first, second] = await Promise.all([
      request(app)
        .post("/api/tickets/7/appears-resolved")
        .set("Cookie", cookie),
      request(app)
        .post("/api/tickets/7/appears-resolved")
        .set("Cookie", cookie),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 409]);
    const loser = first.status === 409 ? first : second;
    expect(loser.body.error.code).toBe("ALREADY_SIGNALLED");
    expect(updateMany).toHaveBeenCalledTimes(2);
    // The conditional WHERE carried the expected state both times.
    for (const call of updateMany.mock.calls) {
      expect(call[0].where).toEqual(
        expect.objectContaining({
          id: 7,
          requesterId: 1,
          appearsResolvedAt: null,
        })
      );
    }
  });

  it("does not overwrite a terminal transition that lands mid-signal: 422 INVALID_TRANSITION", async () => {
    // Pre-check sees OPEN, but by write time staff have closed the ticket, so
    // the conditional write matches nothing and the re-read reports terminal.
    const cookie = authAs(1);
    vi.spyOn(prisma.ticket, "findUnique")
      .mockResolvedValueOnce({ ...OWN_OPEN_TICKET } as any)
      .mockResolvedValue({ ...OWN_OPEN_TICKET, status: "CLOSED" } as any);
    const updateMany = vi
      .spyOn(prisma.ticket, "updateMany")
      .mockResolvedValue({ count: 0 } as any);

    const res = await request(app)
      .post("/api/tickets/7/appears-resolved")
      .set("Cookie", cookie);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_TRANSITION");
    expect(updateMany).toHaveBeenCalledTimes(1);
  });
});

describe("API-17 public comments validation and authorship (AC-12, FR-25, BR-14)", () => {
  it("creates a comment with the backend-set author and timestamp, ignoring anything the client sends", async () => {
    const cookie = authAs(1);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...OWN_OPEN_TICKET,
    } as any);
    const createdAt = new Date("2026-09-12T09:00:00.000Z");
    const create = vi.spyOn(prisma.publicComment, "create").mockResolvedValue({
      id: 55,
      ticketId: 7,
      authorId: 1,
      body: "Still broken after the reboot.",
      createdAt,
    } as any);

    const res = await request(app)
      .post("/api/tickets/7/comments")
      .set("Cookie", cookie)
      .send({ body: "   Still broken after the reboot.   ", authorId: 99 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: 55,
      body: "Still broken after the reboot.",
      author: { id: 1, name: "User 1", role: "REQUESTER" },
      createdAt: createdAt.toISOString(),
    });
    // The stored row carries the trimmed body and the session identity only.
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticketId: 7,
          authorId: 1,
          body: "Still broken after the reboot.",
        }),
      })
    );
  });

  it("rejects empty, whitespace-only and over-limit bodies with 400 and stores nothing", async () => {
    const cookie = authAs(1);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...OWN_OPEN_TICKET,
    } as any);
    const create = vi.spyOn(prisma.publicComment, "create");

    for (const body of ["", "    ", "x".repeat(2001)]) {
      const res = await request(app)
        .post("/api/tickets/7/comments")
        .set("Cookie", cookie)
        .send({ body });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("accepts a body of exactly 2000 characters", async () => {
    const cookie = authAs(1);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...OWN_OPEN_TICKET,
    } as any);
    vi.spyOn(prisma.publicComment, "create").mockResolvedValue({
      id: 56,
      ticketId: 7,
      authorId: 1,
      body: "x".repeat(2000),
      createdAt: new Date("2026-09-12T09:00:00.000Z"),
    } as any);

    const res = await request(app)
      .post("/api/tickets/7/comments")
      .set("Cookie", cookie)
      .send({ body: "x".repeat(2000) });

    expect(res.status).toBe(201);
  });

  it("lists comments ascending with the author shape on the own ticket", async () => {
    const cookie = authAs(1);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...OWN_OPEN_TICKET,
    } as any);
    vi.spyOn(prisma.publicComment, "findMany").mockResolvedValue([
      {
        id: 1,
        body: "First report.",
        author: { id: 1, name: "Anucha Wongchai", role: "REQUESTER" },
        createdAt: new Date("2026-09-11T09:00:00.000Z"),
      },
      {
        id: 2,
        body: "We are looking into it.",
        author: { id: 9, name: "Kittipong Saelim", role: "IT_STAFF" },
        createdAt: new Date("2026-09-11T10:00:00.000Z"),
      },
    ] as any);

    const res = await request(app)
      .get("/api/tickets/7/comments")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.comments).toHaveLength(2);
    expect(res.body.comments[0]).toEqual({
      id: 1,
      body: "First report.",
      author: { id: 1, name: "Anucha Wongchai", role: "REQUESTER" },
      createdAt: new Date("2026-09-11T09:00:00.000Z").toISOString(),
    });
    expect(res.body.comments[1].author.role).toBe("IT_STAFF");
  });

  it("refuses another user's comments to a REQUESTER but serves them to staff and admin", async () => {
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      ...OWN_OPEN_TICKET,
      requesterId: 2,
    } as any);
    const create = vi.spyOn(prisma.publicComment, "create");
    const findMany = vi.spyOn(prisma.publicComment, "findMany");

    const requesterCookie = authAs(1, Role.REQUESTER);
    const forbiddenRead = await request(app)
      .get("/api/tickets/7/comments")
      .set("Cookie", requesterCookie);
    expect(forbiddenRead.status).toBe(403);
    expect(forbiddenRead.body.error.code).toBe("FORBIDDEN");

    const forbiddenWrite = await request(app)
      .post("/api/tickets/7/comments")
      .set("Cookie", requesterCookie)
      .send({ body: "Trying to comment on someone else's ticket." });
    expect(forbiddenWrite.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();

    for (const role of [Role.IT_STAFF, Role.ADMINISTRATOR]) {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
        sessionUser({ id: 9, role, mustChangePassword: false })
      );
      const cookie = sessionCookie({ id: 9, role });
      findMany.mockResolvedValue([] as any);

      const read = await request(app)
        .get("/api/tickets/7/comments")
        .set("Cookie", cookie);
      expect(read.status).toBe(200);
      expect(read.body).toEqual({ comments: [] });
    }
  });

  it("answers 404 for comments on an unknown ticket", async () => {
    const cookie = authAs(1);
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue(null);

    const read = await request(app)
      .get("/api/tickets/999/comments")
      .set("Cookie", cookie);
    expect(read.status).toBe(404);
    expect(read.body.error.code).toBe("NOT_FOUND");

    const write = await request(app)
      .post("/api/tickets/999/comments")
      .set("Cookie", cookie)
      .send({ body: "Nowhere to attach this to." });
    expect(write.status).toBe(404);
    expect(write.body.error.code).toBe("NOT_FOUND");
  });
});
