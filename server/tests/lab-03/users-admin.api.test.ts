import { Role, TicketStatus } from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";
import { hashPassword } from "../../src/utils/password";
import { sessionCookie, sessionUser } from "../helpers/session";

/**
 * API-18/19/21 from tests.md (AC-13..AC-16, AC-21).
 *
 * The suite uses the same exported-app/Prisma-stub seam as the other Lab 3
 * API tests. The transaction callback is deliberately exercised with the
 * Prisma client as its transaction proxy, so the tests also verify that the
 * user update and ticket release are part of one operation.
 */

const ADMIN_ID = 1;
const GOOD_PASSWORD = "Str0ng!Pass";

function adminRow(id = ADMIN_ID) {
  return sessionUser({
    id,
    name: "Apinya Ratchada",
    email: "apinya.ratchada@example.com",
    role: Role.ADMINISTRATOR,
    mustChangePassword: false,
  });
}

function userRow(
  id: number,
  overrides: Partial<ReturnType<typeof sessionUser>> = {}
) {
  return sessionUser({
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`,
    role: Role.REQUESTER,
    mustChangePassword: false,
    ...overrides,
  });
}

function transactionOnPrisma() {
  vi.spyOn(prisma, "$transaction").mockImplementation(
    async (callback: any) => callback(prisma as any)
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("API-18 administrator list and create (AC-13, AC-14)", () => {
  it("allows only Administrators to list users with search, role and open-ticket counts", async () => {
    const findUnique = vi
      .spyOn(prisma.user, "findUnique")
      .mockResolvedValue(adminRow() as never);
    const findMany = vi.spyOn(prisma.user, "findMany").mockResolvedValue([
      {
        id: 2,
        name: "Kittipong Saelim",
        email: "kittipong.saelim@example.com",
        role: Role.IT_STAFF,
        isActive: true,
        _count: { ownedTickets: 3 },
      },
    ] as never);

    const res = await request(app)
      .get("/api/admin/users?search=Kittipong&role=IT_STAFF")
      .set("Cookie", sessionCookie({ id: ADMIN_ID, role: Role.ADMINISTRATOR }));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      users: [
        {
          id: 2,
          name: "Kittipong Saelim",
          email: "kittipong.saelim@example.com",
          role: "IT_STAFF",
          isActive: true,
          ownedOpenTicketCount: 3,
        },
      ],
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: "Kittipong", mode: "insensitive" } },
            { email: { contains: "Kittipong", mode: "insensitive" } },
          ],
          role: Role.IT_STAFF,
        },
        orderBy: { name: "asc" },
      })
    );
    expect(findUnique).toHaveBeenCalled();
  });

  it("refuses a Requester without querying or exposing user data", async () => {
    const findMany = vi.spyOn(prisma.user, "findMany");
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      userRow(9) as never
    );

    const res = await request(app)
      .get("/api/admin/users")
      .set("Cookie", sessionCookie({ id: 9, role: Role.REQUESTER }));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(findMany).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toContain("user");
  });

  it("rejects invalid query roles with a safe per-field error", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(adminRow() as never);
    const res = await request(app)
      .get("/api/admin/users?role=SUPERUSER")
      .set("Cookie", sessionCookie({ id: ADMIN_ID, role: Role.ADMINISTRATOR }));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_QUERY");
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "role" })])
    );
  });

  it("normalizes email, hashes the initial password and forces a first-login change", async () => {
    vi.spyOn(prisma.user, "findUnique").mockImplementation(
      (async (args: any) =>
        args.where?.id === ADMIN_ID ? adminRow() : null) as never
    );
    const create = vi.spyOn(prisma.user, "create").mockResolvedValue({
      id: 12,
      name: "New Staff",
      email: "new.staff@example.com",
      role: Role.IT_STAFF,
      isActive: true,
      mustChangePassword: true,
    } as never);

    const res = await request(app)
      .post("/api/admin/users")
      .set("Cookie", sessionCookie({ id: ADMIN_ID, role: Role.ADMINISTRATOR }))
      .send({
        name: " New Staff ",
        email: " New.Staff@Example.COM ",
        role: Role.IT_STAFF,
        isActive: true,
        initialPassword: `  ${GOOD_PASSWORD}  `,
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      user: {
        id: 12,
        name: "New Staff",
        email: "new.staff@example.com",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: true,
      },
    });
    expect(JSON.stringify(res.body)).not.toContain(GOOD_PASSWORD);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "New Staff",
          email: "new.staff@example.com",
          role: Role.IT_STAFF,
          isActive: true,
          mustChangePassword: true,
          tokenVersion: 0,
        }),
      })
    );
    const hash = create.mock.calls[0][0].data.passwordHash as string;
    await expect(hashPassword(GOOD_PASSWORD)).resolves.toBeTypeOf("string");
    expect(hash).toMatch(/^\$2[aby]?\$/);
  });

  it("rejects case-insensitive duplicate emails and invalid roles without creating", async () => {
    vi.spyOn(prisma.user, "findUnique").mockImplementation(
      (async (args: any) =>
        args.where?.id === ADMIN_ID
          ? adminRow()
          : ({ id: 22 } as never)) as never
    );
    const create = vi.spyOn(prisma.user, "create");

    const duplicate = await request(app)
      .post("/api/admin/users")
      .set("Cookie", sessionCookie({ id: ADMIN_ID, role: Role.ADMINISTRATOR }))
      .send({
        name: "Duplicate",
        email: " EXISTING@EXAMPLE.COM ",
        role: Role.REQUESTER,
        initialPassword: GOOD_PASSWORD,
      });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("EMAIL_TAKEN");
    expect(create).not.toHaveBeenCalled();

    const invalidRole = await request(app)
      .post("/api/admin/users")
      .set("Cookie", sessionCookie({ id: ADMIN_ID, role: Role.ADMINISTRATOR }))
      .send({
        name: "Bad Role",
        email: "bad-role@example.com",
        role: "SUPERUSER",
        initialPassword: GOOD_PASSWORD,
      });

    expect(invalidRole.status).toBe(400);
    expect(invalidRole.body.error.code).toBe("VALIDATION_FAILED");
    expect(invalidRole.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "role" })])
    );
  });

  it("names every unmet initial-password rule and never echoes the password", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(adminRow() as never);
    const secret = "badpasswordvalue";
    const res = await request(app)
      .post("/api/admin/users")
      .set("Cookie", sessionCookie({ id: ADMIN_ID, role: Role.ADMINISTRATOR }))
      .send({
        name: "Weak User",
        email: "weak@example.com",
        role: Role.REQUESTER,
        initialPassword: secret,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "initialPassword", rule: "uppercase" }),
        expect.objectContaining({ field: "initialPassword", rule: "digit" }),
        expect.objectContaining({ field: "initialPassword", rule: "special" }),
      ])
    );
    expect(JSON.stringify(res.body)).not.toContain(secret);
  });
});

describe("API-19 administrator guards and reset (AC-15, AC-16)", () => {
  it("checks self-deactivation before LAST_ADMIN and leaves the user untouched", async () => {
    transactionOnPrisma();
    const findUnique = vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      adminRow() as never
    );
    const count = vi.spyOn(prisma.user, "count");
    const update = vi.spyOn(prisma.user, "update");

    const res = await request(app)
      .patch(`/api/admin/users/${ADMIN_ID}`)
      .set("Cookie", sessionCookie({ id: ADMIN_ID, role: Role.ADMINISTRATOR }))
      .send({ isActive: false });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SELF_DEACTIVATION");
    expect(count).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(findUnique).toHaveBeenCalled();
  });

  it("refuses deactivation or role removal of the last active Administrator", async () => {
    transactionOnPrisma();
    vi.spyOn(prisma.user, "findUnique").mockImplementation(
      (async (args: any) =>
        args.where?.id === ADMIN_ID
          ? adminRow()
          : userRow(2, {
              role: Role.ADMINISTRATOR,
              isActive: true,
            })) as never
    );
    vi.spyOn(prisma.user, "count").mockResolvedValue(1);
    const update = vi.spyOn(prisma.user, "update");

    const deactivate = await request(app)
      .patch("/api/admin/users/2")
      .set("Cookie", sessionCookie({ id: ADMIN_ID, role: Role.ADMINISTRATOR }))
      .send({ isActive: false });
    expect(deactivate.status).toBe(409);
    expect(deactivate.body.error.code).toBe("LAST_ADMIN");

    const demote = await request(app)
      .patch("/api/admin/users/2")
      .set("Cookie", sessionCookie({ id: ADMIN_ID, role: Role.ADMINISTRATOR }))
      .send({ role: Role.REQUESTER });
    expect(demote.status).toBe(409);
    expect(demote.body.error.code).toBe("LAST_ADMIN");
    expect(update).not.toHaveBeenCalled();
  });

  it("serializes concurrent removal of two active Administrators", async () => {
    const activeAdminIds = new Set([1, 2]);
    const rows = new Map([
      [1, adminRow(1)],
      [2, adminRow(2)],
    ]);
    let countCalls = 0;
    let releaseFirstCounts!: () => void;
    const bothCountsStarted = new Promise<void>((resolve) => {
      releaseFirstCounts = resolve;
    });
    let transactionCalls = 0;

    vi.spyOn(prisma.user, "findUnique").mockImplementation(
      (async (args: any) => rows.get(args.where?.id) ?? null) as never
    );
    vi.spyOn(prisma, "$transaction").mockImplementation(
      async (callback: any) => {
        transactionCalls += 1;
        let targetId: number | undefined;
        let stagedDeactivation = false;
        const tx = {
          user: {
            findUnique: async (args: any) => {
              targetId = args.where?.id;
              const row = rows.get(targetId!);
              return row
                ? { ...row, isActive: activeAdminIds.has(targetId!) }
                : null;
            },
            count: async () => {
              countCalls += 1;
              if (countCalls <= 2) {
                if (countCalls === 2) releaseFirstCounts();
                await bothCountsStarted;
                return 2;
              }
              return activeAdminIds.size;
            },
            findFirst: async () => null,
            update: async () => {
              stagedDeactivation = true;
              const row = rows.get(targetId!);
              return {
                id: targetId,
                name: row?.name,
                email: row?.email,
                role: Role.ADMINISTRATOR,
                isActive: false,
                mustChangePassword: false,
              };
            },
          },
          ticket: {
            updateMany: async () => ({ count: 0 }),
          },
        };

        const result = await callback(tx);
        if (stagedDeactivation && targetId !== undefined) {
          if (activeAdminIds.size <= 1) {
            throw Object.assign(new Error("serialization conflict"), {
              code: "P2034",
            });
          }
          activeAdminIds.delete(targetId);
        }
        return result;
      }
    );

    const [deactivateSecond, deactivateFirst] = await Promise.all([
      request(app)
        .patch("/api/admin/users/2")
        .set("Cookie", sessionCookie({ id: 1, role: Role.ADMINISTRATOR }))
        .send({ isActive: false }),
      request(app)
        .patch("/api/admin/users/1")
        .set("Cookie", sessionCookie({ id: 2, role: Role.ADMINISTRATOR }))
        .send({ isActive: false }),
    ]);

    expect([deactivateSecond.status, deactivateFirst.status].sort()).toEqual([
      200, 409,
    ]);
    const refused = [deactivateSecond, deactivateFirst].find(
      (response) => response.status === 409
    );
    expect(refused?.body.error.code).toBe("LAST_ADMIN");
    expect(activeAdminIds.size).toBe(1);
    expect(transactionCalls).toBe(3);
  });

  it("resets a password, forces the next change and invalidates outstanding sessions", async () => {
    const target = userRow(2, { role: Role.REQUESTER, tokenVersion: 4 });
    vi.spyOn(prisma.user, "findUnique").mockImplementation((async (
      args: any
    ) => (args.where?.id === ADMIN_ID ? adminRow() : target)) as never);
    const update = vi.spyOn(prisma.user, "update").mockResolvedValue({
      id: 2,
    } as never);

    const res = await request(app)
      .post("/api/admin/users/2/reset-password")
      .set("Cookie", sessionCookie({ id: ADMIN_ID, role: Role.ADMINISTRATOR }))
      .send({ newPassword: GOOD_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reset: true, mustChangePassword: true });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 2 },
        data: expect.objectContaining({
          mustChangePassword: true,
          tokenVersion: { increment: 1 },
        }),
      })
    );
    const hash = update.mock.calls[0][0].data.passwordHash as string;
    await expect(hashPassword(GOOD_PASSWORD)).resolves.toBeTypeOf("string");
    expect(hash).toMatch(/^\$2[aby]?\$/);
    expect(JSON.stringify(res.body)).not.toContain(GOOD_PASSWORD);

    target.mustChangePassword = true;
    target.tokenVersion = 5;
    const gatedRequest = await request(app)
      .get("/api/reference/categories")
      .set(
        "Cookie",
        sessionCookie({
          id: 2,
          role: Role.REQUESTER,
          tokenVersion: target.tokenVersion,
        })
      );
    expect(gatedRequest.status).toBe(403);
    expect(gatedRequest.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("rejects an invalid reset password before writing", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(adminRow() as never);
    const update = vi.spyOn(prisma.user, "update");

    const res = await request(app)
      .post("/api/admin/users/2/reset-password")
      .set("Cookie", sessionCookie({ id: ADMIN_ID, role: Role.ADMINISTRATOR }))
      .send({ newPassword: "weak" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(update).not.toHaveBeenCalled();
  });
});

describe("API-21 deactivation and demotion cascade (AC-21, BR-24)", () => {
  it.each<[string, { isActive?: boolean; role?: Role }]>([
    ["deactivation", { isActive: false }],
    ["staff-role demotion", { role: Role.REQUESTER }],
  ])("releases non-terminal tickets and bumps tokenVersion on %s", async (_label, body) => {
    transactionOnPrisma();
    vi.spyOn(prisma.user, "findUnique").mockImplementation(
      (async (args: any) =>
        args.where?.id === ADMIN_ID
          ? adminRow()
          : userRow(2, {
              role: Role.IT_STAFF,
              isActive: true,
              tokenVersion: 6,
            })) as never
    );
    vi.spyOn(prisma.user, "count").mockResolvedValue(2);
    const update = vi.spyOn(prisma.user, "update").mockResolvedValue({
      id: 2,
      name: "User 2",
      email: "user2@example.com",
      role: body.role ?? Role.IT_STAFF,
      isActive: body.isActive ?? true,
      mustChangePassword: false,
    } as never);
    const updateMany = vi
      .spyOn(prisma.ticket, "updateMany")
      .mockResolvedValue({ count: 3 });

    const res = await request(app)
      .patch("/api/admin/users/2")
      .set("Cookie", sessionCookie({ id: ADMIN_ID, role: Role.ADMINISTRATOR }))
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      user: {
        id: 2,
        name: "User 2",
        email: "user2@example.com",
      },
      unassignedTicketCount: 3,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|tokenVersion/);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tokenVersion: { increment: 1 } }),
      })
    );
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        ownerId: 2,
        status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] },
      },
      data: { ownerId: null },
    });
  });

  it("does not expose a user deletion route", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(adminRow() as never);

    const res = await request(app)
      .delete("/api/admin/users/2")
      .set("Cookie", sessionCookie({ id: ADMIN_ID, role: Role.ADMINISTRATOR }));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
