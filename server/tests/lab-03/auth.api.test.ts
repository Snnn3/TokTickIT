import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";
import { loginThrottle, LOGIN_WINDOW_MS } from "../../src/utils/loginThrottle";
import {
  hashPassword,
  PASSWORD_MAX_BYTES,
  validatePassword,
} from "../../src/utils/password";
import { SESSION_COOKIE } from "../../src/utils/session";
import { sessionCookie, sessionUser } from "../helpers/session";

/**
 * U-01, API-01..API-06 and API-20 from tests.md.
 *
 * Every test here drives the exported Express app through Supertest with the
 * Prisma client stubbed, which is the Lab 2 seam reused unchanged: no database
 * is required, so the suite runs anywhere.
 */

const GOOD_PASSWORD = "Str0ng!Pass";
const OTHER_PASSWORD = "An0ther!Pass";

function setCookieHeader(res: request.Response): string[] {
  const raw = res.headers["set-cookie"];
  if (!raw) {
    return [];
  }
  return Array.isArray(raw) ? raw : [raw];
}

function sessionSetCookie(res: request.Response): string | undefined {
  return setCookieHeader(res).find((cookie) =>
    cookie.startsWith(`${SESSION_COOKIE}=`)
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  // BR-21 requires a test-only reset: this file's invalid-credential tests
  // drive failed logins through the same in-process counter that API-20
  // measures, and without clearing it between tests API-20 would start
  // part-way to its limit and the tests would pass or fail by ordering.
  loginThrottle.reset();
});

describe("U-01 password policy (BR-07, AC-19)", () => {
  it("accepts a compliant password and trims surrounding whitespace", () => {
    const result = validatePassword(`  ${GOOD_PASSWORD}  `);
    expect(result.valid).toBe(true);
    expect(result.password).toBe(GOOD_PASSWORD);
  });

  it("rejects seven characters and accepts eight", () => {
    expect(validatePassword("Ab3!def").valid).toBe(false);
    expect(
      validatePassword("Ab3!def").failures.some((f) => f.rule === "minLength")
    ).toBe(true);
    expect(validatePassword("Ab3!defg").valid).toBe(true);
  });

  it("rejects a password longer than the bcrypt input limit", () => {
    const atLimit = `Aa1!${"x".repeat(PASSWORD_MAX_BYTES - 4)}`;
    const overLimit = `${atLimit}x`;
    expect(Buffer.byteLength(atLimit, "utf8")).toBe(PASSWORD_MAX_BYTES);
    expect(validatePassword(atLimit).valid).toBe(true);
    expect(
      validatePassword(overLimit).failures.some((f) => f.rule === "maxBytes")
    ).toBe(true);
  });

  it("names the unmet rule for each missing character class", () => {
    const cases: [string, string][] = [
      ["str0ng!pass", "uppercase"],
      ["STR0NG!PASS", "lowercase"],
      ["Strong!Pass", "digit"],
      ["Str0ngPass1", "special"],
    ];
    for (const [password, rule] of cases) {
      const result = validatePassword(password);
      expect(result.valid).toBe(false);
      expect(result.failures.map((f) => f.rule)).toContain(rule);
    }
  });

  it("never echoes the submitted password in a failure (BR-19)", () => {
    const result = validatePassword("secret");
    expect(JSON.stringify(result.failures)).not.toContain("secret");
  });
});

describe("API-01 valid login (AC-01)", () => {
  it("returns the user and sets an http-only session cookie", async () => {
    const stored = sessionUser({
      id: 7,
      name: "Kittipong Saelim",
      email: "kittipong.saelim@example.com",
      passwordHash: await hashPassword(GOOD_PASSWORD),
    });
    vi.spyOn(prisma.user, "findFirst").mockResolvedValue(stored);

    const res = await request(app).post("/api/auth/login").send({
      email: "Kittipong.Saelim@Example.com ",
      password: GOOD_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: 7,
      name: "Kittipong Saelim",
      email: "kittipong.saelim@example.com",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
    });

    const cookie = sessionSetCookie(res);
    expect(cookie).toBeDefined();
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toMatch(/SameSite=Lax/i);

    // BR-19: no response ever carries a hash or a token version.
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("passwordHash");
    expect(body).not.toContain("tokenVersion");
    expect(body).not.toContain(GOOD_PASSWORD);
  });

  it("looks the email up case-insensitively on its lower-cased form (BR-09)", async () => {
    const findFirst = vi
      .spyOn(prisma.user, "findFirst")
      .mockResolvedValue(
        sessionUser({ id: 7, passwordHash: await hashPassword(GOOD_PASSWORD) })
      );

    await request(app)
      .post("/api/auth/login")
      .send({ email: "  MiXeD.Case@Example.COM  ", password: GOOD_PASSWORD });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "mixed.case@example.com" } })
    );
  });

  it("verifies a password against the same trim used when it was set (BR-07)", async () => {
    vi.spyOn(prisma.user, "findFirst").mockResolvedValue(
      sessionUser({
        id: 7,
        // Stored from an input that carried surrounding whitespace.
        passwordHash: await hashPassword(`  ${GOOD_PASSWORD}  `),
      })
    );

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user7@example.com", password: GOOD_PASSWORD });

    expect(res.status).toBe(200);
  });

  it("rejects a request missing either field with 400", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@b.com" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});

describe("API-02 and API-03 generic login failure (AC-02)", () => {
  async function attempt(overrides: {
    user: Awaited<ReturnType<typeof sessionUser>> | null;
    password: string;
  }) {
    vi.spyOn(prisma.user, "findFirst").mockResolvedValue(overrides.user);
    return request(app)
      .post("/api/auth/login")
      .send({ email: "someone@example.com", password: overrides.password });
  }

  it("answers identically for an unknown email, a wrong password and an inactive account", async () => {
    const hash = await hashPassword(GOOD_PASSWORD);

    const unknown = await attempt({ user: null, password: GOOD_PASSWORD });
    loginThrottle.reset();
    const wrongPassword = await attempt({
      user: sessionUser({ id: 1, passwordHash: hash }),
      password: OTHER_PASSWORD,
    });
    loginThrottle.reset();
    const inactive = await attempt({
      user: sessionUser({ id: 1, isActive: false, passwordHash: hash }),
      password: GOOD_PASSWORD,
    });

    for (const res of [unknown, wrongPassword, inactive]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    }
    // The point of the criterion: the bodies are byte-identical, so the screen
    // cannot be used to discover which accounts exist.
    expect(JSON.stringify(wrongPassword.body)).toBe(
      JSON.stringify(unknown.body)
    );
    expect(JSON.stringify(inactive.body)).toBe(JSON.stringify(unknown.body));
  });

  it("issues no session cookie on a failed attempt", async () => {
    const res = await attempt({ user: null, password: GOOD_PASSWORD });
    expect(sessionSetCookie(res)).toBeUndefined();
  });

  it("refuses an account the seed has not given a real password hash yet", async () => {
    // Migrated accounts carry a placeholder until the seed runs. Comparing
    // against it must be an ordinary credential failure, not a thrown error.
    const res = await attempt({
      user: sessionUser({ id: 1, passwordHash: "MIGRATED_PENDING_SEED" }),
      password: GOOD_PASSWORD,
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("API-04 change-password gate (AC-03, BR-02)", () => {
  const gated = sessionUser({ id: 3, mustChangePassword: true });
  const cookie = sessionCookie({ id: 3, mustChangePassword: true });

  beforeEach(() => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(gated);
  });

  it("blocks a normal ticket endpoint with 403 PASSWORD_CHANGE_REQUIRED", async () => {
    const res = await request(app).get("/api/tickets").set("Cookie", cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("blocks the reference endpoints too", async () => {
    const res = await request(app)
      .get("/api/reference/categories")
      .set("Cookie", cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("still allows current-user", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.mustChangePassword).toBe(true);
  });

  it("still allows logout", async () => {
    vi.spyOn(prisma.user, "updateMany").mockResolvedValue({ count: 1 });
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie);
    expect(res.status).toBe(204);
  });

  it("still allows change-password, and does not require the current one on a first login", async () => {
    vi.spyOn(prisma.user, "update").mockResolvedValue(
      sessionUser({ id: 3, tokenVersion: 1 })
    );
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookie)
      .send({ newPassword: GOOD_PASSWORD, confirmPassword: GOOD_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ changed: true, mustChangePassword: false });
  });
});

describe("API-05 password change rules (AC-03, AC-19)", () => {
  const cookie = sessionCookie({ id: 4, mustChangePassword: true });

  beforeEach(async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({
        id: 4,
        mustChangePassword: true,
        passwordHash: await hashPassword(OTHER_PASSWORD),
      })
    );
  });

  it("rejects a password that is too short, naming the rule", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookie)
      .send({ newPassword: "Ab3!def", confirmPassword: "Ab3!def" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "newPassword" }),
      ])
    );
    expect(JSON.stringify(res.body)).toContain("8 characters");
  });

  it("rejects a mismatched confirmation", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookie)
      .send({ newPassword: GOOD_PASSWORD, confirmPassword: OTHER_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "confirmPassword" }),
      ])
    );
  });

  it("names every missing character class at once", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookie)
      .send({ newPassword: "passwords", confirmPassword: "passwords" });

    expect(res.status).toBe(400);
    const issues = JSON.stringify(res.body.error.details);
    expect(issues).toContain("upper case");
    expect(issues).toContain("digit");
    expect(issues).toContain("special");
  });

  it("never echoes the submitted password back to the client (BR-19)", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookie)
      .send({ newPassword: "weakvalue", confirmPassword: "weakvalue" });

    expect(JSON.stringify(res.body)).not.toContain("weakvalue");
  });

  it("rejects reusing the current password", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookie)
      .send({ newPassword: OTHER_PASSWORD, confirmPassword: OTHER_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("PASSWORD_UNCHANGED");
  });

  it("clears the flag, bumps the token version and re-issues the cookie on success", async () => {
    const update = vi
      .spyOn(prisma.user, "update")
      .mockResolvedValue(sessionUser({ id: 4, tokenVersion: 1 }));

    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookie)
      .send({ newPassword: GOOD_PASSWORD, confirmPassword: GOOD_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.mustChangePassword).toBe(false);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mustChangePassword: false,
          tokenVersion: { increment: 1 },
        }),
      })
    );
    expect(sessionSetCookie(res)).toBeDefined();
  });

  it("answers 403 CURRENT_PASSWORD_INVALID, not 401, for a wrong current password", async () => {
    // A 401 here would be read by any client interceptor as an expired login
    // and would bounce the user out of the form they are part-way through.
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({
        id: 5,
        mustChangePassword: false,
        passwordHash: await hashPassword(OTHER_PASSWORD),
      })
    );

    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", sessionCookie({ id: 5 }))
      .send({
        currentPassword: "N0t-the!password",
        newPassword: GOOD_PASSWORD,
        confirmPassword: GOOD_PASSWORD,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CURRENT_PASSWORD_INVALID");
  });

  it("requires the current password once the user is past a first login", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 5, mustChangePassword: false })
    );

    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", sessionCookie({ id: 5 }))
      .send({ newPassword: GOOD_PASSWORD, confirmPassword: GOOD_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "currentPassword" }),
      ])
    );
  });
});

describe("API-06 session invalidation (AC-06, AC-28, FR-30)", () => {
  it("refuses a protected call and a replay of the pre-logout cookie", async () => {
    const cookie = sessionCookie({ id: 8 });
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 8 })
    );

    const before = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(before.status).toBe(200);

    const updateMany = vi
      .spyOn(prisma.user, "updateMany")
      .mockResolvedValue({ count: 1 });
    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie);

    expect(logout.status).toBe(204);
    expect(logout.body).toEqual({});
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { tokenVersion: { increment: 1 } } })
    );
    // The cookie is cleared as well as invalidated.
    expect(sessionSetCookie(logout)).toMatch(
      /toktickit_session=;|toktickit_session=\s*;/
    );

    // The stored version has moved on, so the very same cookie replayed is now
    // refused. This is the difference between a real logout and a cosmetic one.
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 8, tokenVersion: 1 })
    );
    const replay = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("answers 204 for a logout with no cookie at all, never 401", async () => {
    // A client whose session has already expired must still be able to reach a
    // clean signed-out state; 401 here would strand it.
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(204);
  });

  it("answers 204 for a logout carrying a cookie that is no longer valid", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", `${SESSION_COOKIE}=not-a-real-token`);
    expect(res.status).toBe(204);
  });

  it("kills a second outstanding session on a password change while the changing one survives (AC-28)", async () => {
    const deviceA = sessionCookie({ id: 9 });
    const deviceB = sessionCookie({ id: 9 });

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({
        id: 9,
        mustChangePassword: false,
        passwordHash: await hashPassword(OTHER_PASSWORD),
      })
    );
    vi.spyOn(prisma.user, "update").mockResolvedValue(
      sessionUser({ id: 9, tokenVersion: 1 })
    );

    const changed = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", deviceA)
      .send({
        currentPassword: OTHER_PASSWORD,
        newPassword: GOOD_PASSWORD,
        confirmPassword: GOOD_PASSWORD,
      });
    expect(changed.status).toBe(200);

    const refreshed = sessionSetCookie(changed);
    expect(refreshed).toBeDefined();

    // tokenVersion is now 1 in storage.
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 9, mustChangePassword: false, tokenVersion: 1 })
    );

    const otherDevice = await request(app)
      .get("/api/auth/me")
      .set("Cookie", deviceB);
    expect(otherDevice.status).toBe(401);

    const sameDevice = await request(app)
      .get("/api/auth/me")
      .set("Cookie", (refreshed as string).split(";")[0]);
    expect(sameDevice.status).toBe(200);
  });

  it("refuses a session belonging to a deactivated user", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(
      sessionUser({ id: 10, isActive: false })
    );
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", sessionCookie({ id: 10 }));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("refuses an unauthenticated protected call with AUTH_REQUIRED (the Lab 2 code)", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });
});

describe("API-20 login throttling (AC-20, BR-21)", () => {
  beforeEach(() => {
    vi.spyOn(prisma.user, "findFirst").mockResolvedValue(null);
  });

  async function failedLogin(email = "target@example.com") {
    return request(app)
      .post("/api/auth/login")
      .send({ email, password: "Wr0ng!Password" });
  }

  it("answers 429 on the sixth attempt inside the window, worded identically to a 401", async () => {
    const first = await failedLogin();
    for (let attempt = 2; attempt <= 5; attempt += 1) {
      const res = await failedLogin();
      expect(res.status).toBe(401);
    }

    const throttled = await failedLogin();
    expect(throttled.status).toBe(429);
    expect(throttled.body.error.code).toBe("TOO_MANY_ATTEMPTS");
    // Same wording as a credential failure, so a throttled attempt cannot be
    // told apart from a wrong password by the message alone.
    expect(throttled.body.error.message).toBe(first.body.error.message);
  });

  it("counts per email address rather than globally", async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await failedLogin("first@example.com");
    }
    expect((await failedLogin("first@example.com")).status).toBe(429);
    expect((await failedLogin("second@example.com")).status).toBe(401);
  });

  it("treats casing and surrounding whitespace as the same address", async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await failedLogin("target@example.com");
    }
    const res = await failedLogin("  TARGET@Example.COM  ");
    expect(res.status).toBe(429);
  });

  it("clears the counter on a successful login", async () => {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await failedLogin();
    }

    vi.spyOn(prisma.user, "findFirst").mockResolvedValue(
      sessionUser({
        id: 11,
        email: "target@example.com",
        passwordHash: await hashPassword(GOOD_PASSWORD),
      })
    );
    const success = await request(app)
      .post("/api/auth/login")
      .send({ email: "target@example.com", password: GOOD_PASSWORD });
    expect(success.status).toBe(200);

    vi.spyOn(prisma.user, "findFirst").mockResolvedValue(null);
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect((await failedLogin()).status).toBe(401);
    }
  });

  it("expires on its own, with no unlock workflow", async () => {
    // The window is rolling and held in memory. Advancing the injected clock
    // past it is the whole of the recovery path: there is no persisted lockout
    // and nothing for an administrator to unlock.
    let now = Date.parse("2026-09-13T09:00:00Z");
    loginThrottle.reset(() => now);

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await failedLogin();
    }
    expect((await failedLogin()).status).toBe(429);

    now += LOGIN_WINDOW_MS + 1000;
    expect((await failedLogin()).status).toBe(401);
  });
});

describe("BR-22 content-type posture on state-changing requests", () => {
  it("refuses a body sent as a cross-origin-style form post with 415", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .type("form")
      .send("email=a@b.com&password=whatever");

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("exempts a request that carries no body at all, so logout stays reachable", async () => {
    // A browser sends no Content-Type for a body-less fetch. Requiring one here
    // would make signing out impossible.
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(204);
  });
});
