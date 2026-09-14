import { Role } from "@prisma/client";
import { SESSION_COOKIE, signSession } from "../../src/utils/session";

/**
 * Session helpers for the API suites.
 *
 * Lab 2 identified the caller with an `X-Requester-Id` header, which a test
 * could set as a plain string. Lab 3 identifies the caller with a signed
 * session cookie, so a test needs two matching halves: the cookie itself, and
 * the user row the authentication middleware will load and compare against.
 * These two builders keep those halves in step -- the id and tokenVersion in
 * the cookie must equal the ones on the row, or the middleware correctly
 * refuses the request and every assertion after it becomes noise.
 */

export type SessionUserOverrides = {
  id: number;
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
  mustChangePassword?: boolean;
  tokenVersion?: number;
  passwordHash?: string;
};

type SessionUserRow = {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  tokenVersion: number;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

/** The user row `requireSession` expects to load for an authenticated caller. */
export function sessionUser(overrides: SessionUserOverrides): SessionUserRow {
  return {
    id: overrides.id,
    name: overrides.name ?? `User ${overrides.id}`,
    email: overrides.email ?? `user${overrides.id}@example.com`,
    role: overrides.role ?? Role.REQUESTER,
    isActive: overrides.isActive ?? true,
    // False by default: a test about tickets is not a test about the
    // change-password gate, and leaving this true would make every such test
    // answer 403 for a reason it never meant to exercise.
    mustChangePassword: overrides.mustChangePassword ?? false,
    tokenVersion: overrides.tokenVersion ?? 0,
    passwordHash: overrides.passwordHash ?? "$2b$10$not-a-real-hash",
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
  };
}

/** The `Cookie` header value that authenticates as the given user. */
export function sessionCookie(user: number | SessionUserOverrides): string {
  const row = sessionUser(typeof user === "number" ? { id: user } : user);
  return `${SESSION_COOKIE}=${signSession(row)}`;
}
