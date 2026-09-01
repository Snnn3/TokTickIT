import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./prisma";
import { ticketsRouter } from "./routes/tickets";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({ service: "TokTickIT API" });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// Lab 1 compatibility endpoint
app.get("/api/categories", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({
      error: { code: "UNEXPECTED", message: "Failed to load categories" },
    });
  }
});

// Lab 2 Requester Selection endpoint [FR-01, BR-04, AC-19]
app.get("/api/requesters", async (_req, res) => {
  try {
    const requesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
    res.status(200).json({ requesters });
  } catch (error) {
    res.status(500).json({
      error: { code: "UNEXPECTED", message: "Failed to load requesters" },
    });
  }
});

// Lab 2 Reference endpoints [FR-04, BR-09, BR-10]
app.get("/api/reference/categories", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json({ categories });
  } catch (error) {
    res.status(500).json({
      error: { code: "UNEXPECTED", message: "Failed to load reference categories" },
    });
  }
});

app.get("/api/reference/systems", async (_req, res) => {
  try {
    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json({ systems });
  } catch (error) {
    res.status(500).json({
      error: { code: "UNEXPECTED", message: "Failed to load reference systems" },
    });
  }
});

// Lab 2 Tickets Router
app.use("/api/tickets", ticketsRouter);