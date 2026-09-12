import { Router } from "express";
import type { Response } from "express";
import { prisma } from "../prisma";
import type { AuthUser, AuthenticatedRequest } from "../middleware/auth";
import { requireSession } from "../middleware/auth";
import { loginThrottle } from "../utils/loginThrottle";
import {
  hashPassword,
  normalizePassword,
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

  // Throttle first, so a throttled caller never reaches the hash comparison.
  if (loginThrottle.isThrottled(email)) {
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
    // into an account-enumeration oracle.
    const passwordMatches = user
      ? await verifyPassword(password, user.passwordHash)
      : false;
    if (!user || !user.isActive || !passwordMatches) {
      loginThrottle.recordFailure(email);
      refuseLogin(res, 401);
      return;
    }

    loginThrottle.clear(email);
    issueSession(res, user);
    res.status(200).json({
      user: publicUser(user),
    });
  } catch {
    res.status(500).json({
      error: { code: "UNEXPECTED", message: "Failed to sign in" },
    });
  }
});

// POST /api/auth/logout [FR-18, FR-30, BR-20, AC-06, AC-28]
//
// No cookie is required and the answer is always 204. A client whose session
// has already expired or been invalidated must still be able to complete a
// sign-out and reach a clean state; answering 401 here would strand the user
// on a screen whose only escape is the action that just failed.
authRouter.post("/logout", async (req: AuthenticatedRequest, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  res.clearCookie(SESSION_COOKIE, clearedSessionCookieOptions());

  if (!token) {
    res.status(204).end();
    return;
  }

  try {
    const session = verifySession(token);
    if (session) {
      // Bumping tokenVersion is what kills the cookie that was just sent, and
      // every other outstanding cookie for this user, rather than merely
      // asking the browser to forget one of them.
      await prisma.user.updateMany({
        where: { id: session.sub },
        data: { tokenVersion: { increment: 1 } },
      });
    }
  } catch {
    // A sign-out must never fail. The cookie is already cleared; a bookkeeping
    // error here leaves the old token valid until it expires, which is strictly
    // better than refusing to sign the user out.
  }

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
