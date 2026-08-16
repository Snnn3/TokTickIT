import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

export const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({ service: "TokTickIT API" });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

app.get("/api/categories", async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { id: "asc" },
    select: { id: true, name: true },
  });
  res.status(200).json(categories);
});