import { Router } from "express";
import type { Response } from "express";
import { prisma } from "../prisma";
import type { AuthUser, AuthenticatedRequest } from "../middleware/auth";
import { requireSession } from "../middleware/auth";
import { loginThrottle } from "../utils/loginThrottle";
import {
  hashPassword,
  isUsablePasswordHash,
  normalizePassword,
  timingEqualizerHash,
  validatePassword,
  verifyPassword,
} from "../utils/password";
import {
  clearedSessionCookieOptions,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifySession,
} from "../utils/session";

/**
 * Authentication endpoints [FR-16, FR-17, FR-18, FR-29, FR-30].
 *
 * api-spec.md section 2 is the contract. Two properties run through all four
 * handlers: no response ever carries a password, a hash or a tokenVersion
 * (BR-19), and every login failure is worded identically whatever caused it
 * (BR-01, BR-21).
 */

export const authRouter = Router();

/** The one shape any endpoint may return for a user (BR-19). */
function publicUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}

/**
 * One message for an unknown email, a wrong password, an inactive account and
 * a throttled attempt [BR-01, BR-21, AC-02, AC-20]. Only the status code
 * differs, and it differs because the contract says so rather than because the
 * text leaks which case occurred.
 */
const GENERIC_LOGIN_FAILURE = "Email or password is incorrect";

function refuseLogin(res: Response, status: 401 | 429): void {
  res.status(status).json({
    error: {
      code: status === 429 ? "TOO_MANY_ATTEMPTS" : "INVALID_CREDENTIALS",
      message: GENERIC_LOGIN_FAILURE,
    },
  });
}

function issueSession(
  res: Response,
  user: { id: number; role: AuthUser["role"]; tokenVersion: number }
): void {
  res.cookie(SESSION_COOKIE, signSession(user), sessionCookieOptions());
}

// POST /api/auth/login [FR-16, BR-01, BR-21, AC-01, AC-02, AC-20]
authRouter.post("/login", async (req: AuthenticatedRequest, res) => {
  const rawEmail = typeof req.body?.email === "string" ? req.body.email : "";
  const email = rawEmail.trim().toLowerCase();
  const password = normalizePassword(req.body?.password);

  if (!email || !password) {
    res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Email and password are required",
        details: [
          ...(email ? [] : [{ field: "email", issue: "Email is required" }]),
          ...(password
            ? []
            : [{ field: "password", issue: "Password is required" }]),
        ],
      },
    });
    return;
  }

  // Atomic admission: the throttle check reserves its slot synchronously
  // before the first await, so parallel failures cannot all slip past the
  // limit and answer 401. The reservation is the failure record -- it stays
  // on a credential failure, clears on success, and is withdrawn when the
  // attempt never reached a verdict [BR-21, AC-20].
  if (!loginThrottle.tryAdmit(email)) {
    refuseLogin(res, 429);
    return;
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        tokenVersion: true,
        passwordHash: true,
      },
    });

    // An unknown email, a wrong password and a deactivated account are one
    // outcome here on purpose: distinguishing them would turn the login form
    // into an account-enumeration oracle. That has to hold for elapsed time as
    // well as for the body, so every attempt pays exactly one bcrypt
    // comparison -- against the stored hash where there is a usable one, and
    // against a hash nothing can match otherwise. A migrated account still
    // carrying the seed placeholder takes the same path as an unknown address.
    const comparableHash =
      user && isUsablePasswordHash(user.passwordHash)
        ? user.passwordHash
        : timingEqualizerHash();
    const passwordMatches = await verifyPassword(password, comparableHash);
    if (!user || !user.isActive || !passwordMatches) {
      // Already counted by tryAdmit above; recording again would double-count
      // every failure and throttle on the third attempt instead of the sixth.
      refuseLogin(res, 401);
      return;
    }

    loginThrottle.clear(email);
    issueSession(res, user);
    res.status(200).json({
      user: publicUser(user),
    });
  } catch {
    // The attempt never reached a credential verdict, so its reservation must
    // not consume throttle budget. Without this a database outage would lock
    // every address out on top of failing it.
    loginThrottle.cancelAdmission(email);
    res.status(500).json({
      error: { code: "UNEXPECTED", message: "Failed to sign in" },
    });
  }
});

// POST /api/auth/logout [FR-18, FR-30, BR-20, AC-06, AC-28]
//
// No cookie is required and the answer is 204 on every path where the session
// is known to be dead: no cookie, an invalid cookie, a successful revocation,
// or a stale-version replay that matched zero rows. A client whose session
// has already expired or been invalidated must still be able to complete a
// sign-out and reach a clean state; answering 401 here would strand the user
// on a screen whose only escape is the action that just failed.
//
// The 500 path is the deliberate exception (AC-06, FR-30): a rejected
// updateMany leaves the presented cookie valid for up to eight hours, so the
// cookie is NOT cleared and the client must keep its local session so a retry
// is possible. Clearing here would report a live session as signed out while
// the replay still yields 200 on GET /api/auth/me.
authRouter.post("/logout", async (req: AuthenticatedRequest, res) => {
  const token = req.cookies?.[SESSION_COOKIE];

  if (!token) {
    res.clearCookie(SESSION_COOKIE, clearedSessionCookieOptions());
    res.status(204).end();
    return;
  }

  // verifySession swallows every token-level failure itself and answers null,
  // so only a missing JWT_SECRET throws here. That misconfiguration must
  // surface as a 500 WITHOUT clearing the cookie: the session may still be
  // live, and reporting it as signed out would strand the retry the same way
  // a failed revocation does.
  let session: ReturnType<typeof verifySession>;
  try {
    session = verifySession(token); // cannot throw except on config
  } catch {
    res.status(500).json({
      error: {
        code: "UNEXPECTED",
        message: "Failed to complete the sign-out",
      },
    });
    return;
  }

  if (!session) {
    res.clearCookie(SESSION_COOKIE, clearedSessionCookieOptions());
    res.status(204).end();
    return;
  }

  if (session) {
    // Bumping tokenVersion is what kills the cookie that was just sent, and
    // every other outstanding cookie for this user, rather than merely
    // asking the browser to forget one of them.
    //
    // The version the cookie carries is part of the filter, because
    // verifySession checks only the signature and the expiry. Without it, an
    // already-invalidated cookie replayed inside its eight-hour lifetime
    // would still bump the counter and so sign out whichever session the user
    // actually holds now. Matching zero rows is the right outcome there, and
    // the answer stays 204 either way.
    //
    // A rejected updateMany is the opposite case: tokenVersion never moved, so
    // the presented cookie stays valid for up to eight hours. Answering 204
    // or clearing the cookie here would report that live session as signed
    // out (AC-06, FR-30), so it fails loudly instead and the client keeps its
    // local session for a retry.
    try {
      await prisma.user.updateMany({
        where: { id: session.sub, tokenVersion: session.tv },
        data: { tokenVersion: { increment: 1 } },
      });
    } catch {
      res.status(500).json({
        error: {
          code: "UNEXPECTED",
          message: "Failed to complete the sign-out",
        },
      });
      return;
    }
  }

  res.clearCookie(SESSION_COOKIE, clearedSessionCookieOptions());
  res.status(204).end();
});

// GET /api/auth/me [FR-18]
authRouter.get("/me", requireSession, (req: AuthenticatedRequest, res) => {
  res.status(200).json({ user: publicUser(req.authUser as AuthUser) });
});

// POST /api/auth/change-password [FR-17, BR-07, BR-20, AC-03, AC-19, AC-28]
authRouter.post(
  "/change-password",
  requireSession,
  async (req: AuthenticatedRequest, res) => {
    const authUser = req.authUser as AuthUser;
    const currentPassword = normalizePassword(req.body?.currentPassword);
    const confirmPassword = normalizePassword(req.body?.confirmPassword);
    const validation = validatePassword(req.body?.newPassword);
    const newPassword = validation.password;

    // Only field names and rule text, never the submitted value (BR-19).
    const details: { field: string; issue: string }[] = validation.failures.map(
      ({ field, issue }) => ({ field, issue })
    );
    // currentPassword is required except on a first login, where the user has
    // only ever been told an initial password by an administrator.
    if (!authUser.mustChangePassword && !currentPassword) {
      details.push({
        field: "currentPassword",
        issue: "Current password is required",
      });
    }
    if (newPassword && confirmPassword !== newPassword) {
      details.push({
        field: "confirmPassword",
        issue: "Confirmation does not match the new password",
      });
    }

    if (details.length) {
      res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "The new password does not meet the requirements",
          details,
        },
      });
      return;
    }

    try {
      const stored = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: {
          id: true,
          role: true,
          passwordHash: true,
          tokenVersion: true,
        },
      });
      if (!stored) {
        res.status(401).json({
          error: { code: "AUTH_REQUIRED", message: "Authentication required" },
        });
        return;
      }

      if (!authUser.mustChangePassword) {
        const currentMatches = await verifyPassword(
          currentPassword,
          stored.passwordHash
        );
        if (!currentMatches) {
          // 403, not 401: BR-18 reserves 401 for an absent or invalid session,
          // and a client interceptor reading 401 as an expired login would
          // bounce the user out of the form they are part-way through.
          res.status(403).json({
            error: {
              code: "CURRENT_PASSWORD_INVALID",
              message: "Current password is incorrect",
            },
          });
          return;
        }
      }

      const sameAsCurrent = await verifyPassword(
        newPassword,
        stored.passwordHash
      );
      if (sameAsCurrent) {
        res.status(400).json({
          error: {
            code: "PASSWORD_UNCHANGED",
            message: "The new password must differ from the current one",
          },
        });
        return;
      }

      const updated = await prisma.user.update({
        where: { id: stored.id },
        data: {
          passwordHash: await hashPassword(newPassword),
          mustChangePassword: false,
          // Kills every other outstanding session for this user (BR-20, AC-28).
          tokenVersion: { increment: 1 },
        },
        select: { id: true, role: true, tokenVersion: true },
      });

      // A fresh cookie carrying the new version, so the session that performed
      // the change survives while the others die.
      issueSession(res, updated);
      res.status(200).json({ changed: true, mustChangePassword: false });
    } catch {
      res.status(500).json({
        error: { code: "UNEXPECTED", message: "Failed to change the password" },
      });
    }
  }
);
