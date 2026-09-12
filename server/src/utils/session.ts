import type { CookieOptions } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

/**
 * Session token and cookie mechanics [BR-08, BR-20, D1].
 *
 * A JWT in an http-only cookie rather than a bearer token in localStorage: the
 * browser sends it through the Vite proxy without any client code touching it,
 * which is what keeps it out of reach of injected script.
 */

export const SESSION_COOKIE = "toktickit_session";

/** Roughly eight hours, per BR-08. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export type SessionClaims = {
  /** User id. */
  sub: number;
  role: Role;
  /** tokenVersion at issue, compared against the stored value on every request. */
  tv: number;
};

/**
 * The secret lives in the server environment and nowhere else -- never in the
 * repository, never in a response, never sent to the client. Reading it lazily
 * rather than at module load keeps the failure at the request that needs it,
 * which is far easier to diagnose than an import-time crash.
 */
function sessionSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

export function signSession(user: {
  id: number;
  role: Role;
  tokenVersion: number;
}): string {
  const claims: SessionClaims = {
    sub: user.id,
    role: user.role,
    tv: user.tokenVersion,
  };
  return jwt.sign(claims, sessionSecret(), {
    expiresIn: SESSION_TTL_SECONDS,
  });
}

export function verifySession(token: string | undefined): SessionClaims | null {
  if (!token) {
    return null;
  }
  try {
    const decoded = jwt.verify(token, sessionSecret());
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.sub !== "number" ||
      typeof decoded.tv !== "number" ||
      typeof decoded.role !== "string"
    ) {
      return null;
    }
    return {
      sub: decoded.sub,
      role: decoded.role as Role,
      tv: decoded.tv,
    };
  } catch {
    // Expired, tampered with, or signed by a different secret -- all of which
    // are the same thing to a caller: there is no usable session.
    return null;
  }
}

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}

export function clearedSessionCookieOptions(): CookieOptions {
  const { maxAge, ...rest } = sessionCookieOptions();
  return rest;
}
