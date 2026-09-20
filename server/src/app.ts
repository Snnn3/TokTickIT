import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { requireAuth, requireJsonBody } from "./middleware/auth";
import { prisma } from "./prisma";
import { attachmentsRouter } from "./routes/attachments";
import { adminRouter } from "./routes/admin";
import { authRouter } from "./routes/auth";
import { staffRouter } from "./routes/staff";
import { ticketsRouter } from "./routes/tickets";

export const app = express();

// CORS without credentials, deliberately: no foreign origin can cause the
// session cookie to be sent, which is the second of the three properties
// BR-22 relies on instead of a CSRF token [D14].
app.use(cors({ credentials: false }));
app.use(express.json());
app.use(cookieParser());
app.use(requireJsonBody);

app.get("/", (_req, res) => {
  res.status(200).json({ service: "TokTickIT API" });
});

// Liveness probe, deliberately public and ungated (Issue #37 exception): it
// answers whether the process is up, not who is asking, so it stays 200 for
// anonymous callers and for gated users (mustChangePassword=true) alike. It
// sits beside the Lab 1 compatibility exception below -- together they are the
// only two paths the change-password gate never closes.
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// Lab 1 compatibility endpoint. Unauthenticated by carry-over (BR-29): the Lab 1 suite
// asserts an anonymous 200 here and BR-28 classifies every Lab 1 test as
// unchanged, so protecting this path would retire a test the disposition keeps.
// This is the approved exception to BR-02's change-password gate (Issue #37):
// a gated user (mustChangePassword=true) also receives 200 here, because the
// gate closes every endpoint EXCEPT current-user, change-password, logout --
// and this public compatibility path was never closed to begin with.
// The authenticated reference endpoints below are what the Lab 3 client uses.
app.get("/api/categories", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch {
    res.status(500).json({
      error: { code: "UNEXPECTED", message: "Failed to load categories" },
    });
  }
});

// Lab 3 authentication [FR-16, FR-17, FR-18]
app.use("/api/auth", authRouter);

// Reference endpoints. Authenticated from Lab 3 onward: active categories and
// systems are internal service-desk configuration rather than public data, so
// the authorization matrix gives them a row like everything else [FR-04].
app.get("/api/reference/categories", ...requireAuth, async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json({ categories });
  } catch {
    res.status(500).json({
      error: {
        code: "UNEXPECTED",
        message: "Failed to load reference categories",
      },
    });
  }
});

app.get("/api/reference/systems", ...requireAuth, async (_req, res) => {
  try {
    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json({ systems });
  } catch {
    res.status(500).json({
      error: {
        code: "UNEXPECTED",
        message: "Failed to load reference systems",
      },
    });
  }
});

// Administrator user management [FR-26]. The router applies the
// Administrator-only role guard to every endpoint, including direct URLs.
app.use("/api/admin", adminRouter);

// Requester ticket and attachment routes, carried over from Lab 2 with the
// identity mechanism replaced: the owner is the authenticated user, never a
// value the client supplied [FR-20, BR-03].
// Staff queue and assignee reads, carried by the staff slice [FR-22, BR-16].
// Mounted after the requester routes; the /api/staff/* prefix keeps the two
// from ever colliding, and the router's role guard makes Administrator a
// superset of IT Staff here (D2).
app.use("/api/staff", staffRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/attachments", attachmentsRouter);

// Unknown API routes answer JSON, never the framework HTML default. Placed
// after every /api/* router but before the terminal error handler, so it
// covers all methods and paths under /api that matched nothing above while
// leaving `/`, /api/health and non-/api paths untouched. The envelope keeps
// the response-shape contract (envelope on every non-2xx) with no stack or
// path leak.
app.use("/api", (_req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "API route not found" },
  });
});

// Terminal error handler, after the routers. Without it the framework default
// answers a malformed JSON body with an HTML stack trace carrying absolute
// filesystem paths, against the response-shape contract (envelope on every
// non-2xx, safe generic messages, never stacks). A body-parser SyntaxError is
// a client fault (400 VALIDATION_FAILED); anything else reaching here is a
// server fault (500 UNEXPECTED).
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Request body is not valid JSON",
      },
    });
  }
  return res.status(500).json({
    error: { code: "UNEXPECTED", message: "Unexpected server error" },
  });
});
