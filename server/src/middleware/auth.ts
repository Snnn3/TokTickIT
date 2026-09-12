import type { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../prisma";
import { SESSION_COOKIE, verifySession } from "../utils/session";

/**
 * Session authentication and authorization [FR-16, FR-19, BR-02, BR-08,
 * BR-18, BR-20, BR-22, AC-03, AC-04].
 *
 * Identity comes from the signed session cookie and nothing else. There is no
 * header, query parameter or body field a client can send to claim a different
 * identity, which is what makes BR-03 true by construction rather than by
 * every route remembering to check.
 */

/** The only user fields any route needs, and the only ones BR-19 permits out. */
export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
};

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] };
  file?: Express.Multer.File;
}

/**
 * The code for an unauthenticated request is AUTH_REQUIRED, carried over
 * unchanged from Lab 2 so the surviving Lab 2 suites keep asserting the same
 * value. INVALID_CREDENTIALS is reserved for a failed login attempt.
 */
function refuseUnauthenticated(res: Response): void {
  res.status(401).json({
    error: {
      code: "AUTH_REQUIRED",
      message: "Authentication required",
    },
  });
}

/**
 * Verifies the session and loads the user, rejecting a missing, inactive or
 * stale-tokenVersion account. This is the step that makes logout, password
 * change and deactivation real rather than cosmetic (BR-20): a cookie that was
 * valid a moment ago stops working the instant the stored version moves on.
 *
 * It deliberately does not apply the change-password gate, because the three
 * endpoints a gated user must still reach run through this middleware too.
 */
export async function requireSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const claims = verifySession(req.cookies?.[SESSION_COOKIE]);
  if (!claims) {
    refuseUnauthenticated(res);
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        tokenVersion: true,
      },
    });

    if (!user || !user.isActive || user.tokenVersion !== claims.tv) {
      refuseUnauthenticated(res);
      return;
    }

    const { tokenVersion: _tokenVersion, ...authUser } = user;
    req.authUser = authUser;
    next();
  } catch {
    res.status(500).json({
      error: {
        code: "UNEXPECTED",
        message: "Failed to verify the session",
      },
    });
  }
}

/**
 * The change-password gate [BR-02, AC-03]. Everything except current-user,
 * change-password and logout is closed to a user still carrying an initial
 * password, so an unchanged initial password cannot be used to work the system.
 */
export function requirePasswordChanged(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.authUser?.mustChangePassword) {
    res.status(403).json({
      error: {
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your password before continuing",
      },
    });
    return;
  }
  next();
}

/** Session plus the change-password gate: what every normal endpoint needs. */
export const requireAuth = [requireSession, requirePasswordChanged] as const;

/**
 * Role guard. Administrator is a superset of IT Staff for ticket operations
 * (D2), so the staff routes pass both roles rather than IT_STAFF alone.
 */
export function requireRole(...allowed: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      refuseUnauthenticated(res);
      return;
    }
    if (!allowed.includes(req.authUser.role)) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Your role does not permit this operation",
        },
      });
      return;
    }
    next();
  };
}

/**
 * CSRF posture, third property [BR-22, D14]. SameSite=Lax and non-credentialed
 * CORS do the real work; this rejects the simple cross-origin form post, which
 * can only ever send a form or text content type.
 *
 * The rule is stated by request shape rather than by an endpoint list, so it
 * stays correct as endpoints are added: a request with no body has nothing for
 * a cross-origin form post to smuggle. That exemption is not a convenience --
 * a browser sends no Content-Type for a body-less fetch, so without it logout
 * would answer 415 and be unreachable.
 */
export function requireJsonBody(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    next();
    return;
  }

  const length = req.headers["content-length"];
  const hasBody =
    Boolean(req.headers["transfer-encoding"]) ||
    (typeof length === "string" && Number(length) > 0);
  if (!hasBody) {
    next();
    return;
  }

  const contentType = (req.headers["content-type"] ?? "").toLowerCase();
  const accepted =
    contentType.includes("application/json") ||
    contentType.includes("multipart/form-data");
  if (!accepted) {
    res.status(415).json({
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message:
          "A request with a body must be sent as application/json, or multipart/form-data where the endpoint accepts an upload",
      },
    });
    return;
  }
  next();
}
