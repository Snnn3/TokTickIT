import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Role } from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";
import { loginThrottle } from "../../src/utils/loginThrottle";
import { hashPassword } from "../../src/utils/password";
import { sessionCookie, sessionUser } from "../helpers/session";

/**
 * API-26 from tests.md, plus the documentation consistency BR-27 depends on.
 *
 * Scoped deliberately to behaviour *after* migration. A stubbed Prisma client
 * cannot prove anything about what the migration did to real rows, so the
 * preservation evidence lives in M-01 (`prisma/migration-evidence/capture.ts`,
 * run against the development database) and this file asserts only the
 * consequences a migrated account should show.
 */

const INITIAL_PASSWORD = "ChangeMe!2026";
const NEW_PASSWORD = "Str0ng!Pass";
const REPO_ROOT = join(__dirname, "..", "..", "..");

beforeEach(() => {
  vi.restoreAllMocks();
  loginThrottle.reset();
});

describe("API-26 migrated requester behaviour (AC-26, BR-27)", () => {
  /** The shape the Lab 3 migration and seed leave a carried-over requester in. */
  const migrated = async () =>
    sessionUser({
      id: 1,
      name: "Anucha Wongchai",
      email: "anucha.wongchai@example.com",
      role: Role.REQUESTER,
      mustChangePassword: true,
      passwordHash: await hashPassword(INITIAL_PASSWORD),
    });

  it("signs in with the documented initial password", async () => {
    vi.spyOn(prisma.user, "findFirst").mockResolvedValue(await migrated());

    const res = await request(app).post("/api/auth/login").send({
      email: "anucha.wongchai@example.com",
      password: INITIAL_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("REQUESTER");
    expect(res.body.user.mustChangePassword).toBe(true);
  });

  it("is gated out of every normal endpoint until a new password is saved", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(await migrated());
    const cookie = sessionCookie({ id: 1, mustChangePassword: true });

    for (const path of [
      "/api/tickets",
      "/api/tickets/1",
      "/api/reference/categories",
      "/api/reference/systems",
    ]) {
      const res = await request(app).get(path).set("Cookie", cookie);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    }
  });

  it("still owns its Lab 2 tickets once the password change is done", async () => {
    // The migration reused the RequesterUser primary keys as User primary
    // keys, so Ticket.requesterId never moved and ownership is preserved by
    // construction. What this asserts is the consequence: the migrated account
    // queries its own tickets by the authenticated id and gets them back.
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({
        id: 1,
        name: "Anucha Wongchai",
        email: "anucha.wongchai@example.com",
        mustChangePassword: false,
      })
    );
    const findMany = vi.spyOn(prisma.ticket, "findMany").mockResolvedValue([
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
    ] as never);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(1);

    const res = await request(app)
      .get("/api/tickets")
      .set("Cookie", sessionCookie({ id: 1 }));

    expect(res.status).toBe(200);
    expect(res.body.tickets[0].number).toBe("TKT-2026-00010");
    // Scoped to the authenticated identity, never to anything the client sent.
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ requesterId: 1 }),
      })
    );
  });

  it("ignores a client-supplied identity and applies the authenticated one (BR-03, AC-04)", async () => {
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

  it("accepts the eight-value status filter while the Lab 2 query still works", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false })
    );
    vi.spyOn(prisma.ticket, "findMany").mockResolvedValue([] as never);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(0);
    const cookie = sessionCookie({ id: 1 });

    const statuses = [
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "RESOLVED",
      "CLOSED",
      "REOPENED",
      "CANCELLED",
    ];
    for (const status of statuses) {
      const res = await request(app)
        .get(`/api/tickets?status=${status}`)
        .set("Cookie", cookie);
      expect(res.status).toBe(200);
    }

    const rejected = await request(app)
      .get("/api/tickets?status=ARCHIVED")
      .set("Cookie", cookie);
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.code).toBe("INVALID_QUERY");
  });

  it("lets the migrated account through once the password is changed", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(await migrated());
    vi.spyOn(prisma.user, "update").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false, tokenVersion: 1 })
    );

    const changed = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", sessionCookie({ id: 1, mustChangePassword: true }))
      .send({ newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });

    expect(changed.status).toBe(200);
    expect(changed.body.mustChangePassword).toBe(false);

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 1, mustChangePassword: false, tokenVersion: 1 })
    );
    vi.spyOn(prisma.ticket, "findMany").mockResolvedValue([] as never);
    vi.spyOn(prisma.ticket, "count").mockResolvedValue(0);

    const tickets = await request(app)
      .get("/api/tickets")
      .set("Cookie", sessionCookie({ id: 1, tokenVersion: 1 }));
    expect(tickets.status).toBe(200);
  });
});

describe("BR-27 the documented initial password is one value in three places", () => {
  // v1.6 of the contract was corrected because it claimed documentation that
  // did not exist. This asserts the claim instead of restating it: the README
  // is the authoritative source, and the seed fallback and the example
  // environment file must agree with it or a fresh clone cannot sign in.
  const read = (relative: string) =>
    readFileSync(join(REPO_ROOT, relative), "utf8");

  it("appears in the README, the seed fallback and .env.example", () => {
    expect(read("README.md")).toContain(INITIAL_PASSWORD);
    expect(read("server/prisma/seed.ts")).toContain(INITIAL_PASSWORD);
    expect(read("server/.env.example")).toContain(INITIAL_PASSWORD);
  });

  it("satisfies the password policy it asks users to replace", () => {
    // An initial password that could not itself be saved through the
    // change-password form would be a confusing thing to hand a new user.
    expect(INITIAL_PASSWORD).toMatch(/[A-Z]/);
    expect(INITIAL_PASSWORD).toMatch(/[a-z]/);
    expect(INITIAL_PASSWORD).toMatch(/[0-9]/);
    expect(INITIAL_PASSWORD).toMatch(/[^a-zA-Z0-9]/);
    expect(INITIAL_PASSWORD.length).toBeGreaterThanOrEqual(8);
  });

  it("documents both new environment keys without committing a real secret", () => {
    const example = read("server/.env.example");
    expect(example).toContain("JWT_SECRET");
    expect(example).toContain("SEED_INITIAL_PASSWORD");
    expect(example).toMatch(/JWT_SECRET="replace-with-/);
  });
});
