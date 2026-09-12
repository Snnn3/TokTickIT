import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { requireAuth, requireJsonBody } from "./middleware/auth";
import { prisma } from "./prisma";
import { attachmentsRouter } from "./routes/attachments";
import { authRouter } from "./routes/auth";
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

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// Lab 1 compatibility endpoint. Unauthenticated by carry-over: the Lab 1 suite
// asserts an anonymous 200 here and BR-28 classifies every Lab 1 test as
// unchanged, so protecting this path would retire a test the disposition keeps.
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

// Requester ticket and attachment routes, carried over from Lab 2 with the
// identity mechanism replaced: the owner is the authenticated user, never a
// value the client supplied [FR-20, BR-03].
app.use("/api/tickets", ticketsRouter);
app.use("/api/attachments", attachmentsRouter);
