import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";
import express from "express";
import { requireRequester, AuthenticatedRequest } from "../../src/middleware/requester";

describe("GET /api/requesters (API-REQ-01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns active requesters in name ascending order (AC-19, BR-04)", async () => {
    vi.spyOn(prisma.requesterUser, "findMany").mockResolvedValueOnce([
      { id: 1, name: "Anucha Wongchai", email: "anucha.wongchai@example.com" } as any,
      { id: 2, name: "Busaba Srisawat", email: "busaba.srisawat@example.com" } as any,
    ]);

    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      requesters: [
        { id: 1, name: "Anucha Wongchai", email: "anucha.wongchai@example.com" },
        { id: 2, name: "Busaba Srisawat", email: "busaba.srisawat@example.com" },
      ],
    });
    expect(prisma.requesterUser.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
  });

  it("returns safe 500 error envelope when database fails", async () => {
    vi.spyOn(prisma.requesterUser, "findMany").mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: "UNEXPECTED", message: "Failed to load requesters" },
    });
  });
});

describe("requireRequester middleware (BR-03, BR-22)", () => {
  const testApp = express();
  testApp.use(express.json());
  testApp.get("/test-protected", requireRequester, (req: AuthenticatedRequest, res) => {
    res.status(200).json({ success: true, requester: req.requester });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 AUTH_REQUIRED when X-Requester-Id header is missing", async () => {
    const res = await request(testApp).get("/test-protected");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: "AUTH_REQUIRED",
        message: "Development requester identification required",
      },
    });
  });

  it("returns 401 AUTH_REQUIRED when X-Requester-Id is not a valid number", async () => {
    const res = await request(testApp)
      .get("/test-protected")
      .set("X-Requester-Id", "abc");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("returns 401 AUTH_REQUIRED when requester is inactive or not found", async () => {
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValueOnce(null);

    const res = await request(testApp)
      .get("/test-protected")
      .set("X-Requester-Id", "99");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("passes when valid active requester id is provided", async () => {
    const mockUser = {
      id: 1,
      name: "Anucha Wongchai",
      email: "anucha.wongchai@example.com",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValueOnce(mockUser);

    const res = await request(testApp)
      .get("/test-protected")
      .set("X-Requester-Id", "1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.requester.id).toBe(1);
    expect(res.body.requester.name).toBe("Anucha Wongchai");
  });
});
