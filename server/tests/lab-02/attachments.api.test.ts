import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

describe("Attachments API (A-16..A-20, FR-10..FR-12, BR-13, BR-15..BR-17, AC-07..AC-12)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("A-16: adds attachment to owned ticket (201) and leaves ticket untouched on failures (FR-10, BR-15)", async () => {
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValue({
      id: 1,
      name: "Anucha Wongchai",
      email: "anucha.wongchai@example.com",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      id: 20,
      requesterId: 1,
    } as any);

    vi.spyOn(prisma.attachment, "count").mockResolvedValue(2);

    vi.spyOn(prisma.attachment, "create").mockResolvedValue({
      id: 201,
      ticketId: 20,
      filename: "screenshot.png",
      mimeType: "image/png",
      sizeBytes: 1500,
      data: Buffer.from("fake image bytes"),
      uploadedAt: new Date(),
      removedAt: null,
      removedReason: null,
    } as any);

    const res = await request(app)
      .post("/api/tickets/20/attachments")
      .set("X-Requester-Id", "1")
      .attach("file", Buffer.from("fake image bytes"), "screenshot.png");

    expect(res.status).toBe(201);
    expect(res.body.attachment.id).toBe(201);
    expect(res.body.attachment.filename).toBe("screenshot.png");
  });

  it("A-17: enforces attachment limits: 6th active -> 409 LIMIT_REACHED; unsupported type -> 415; oversize -> 413 (AC-07..AC-09, BR-13)", async () => {
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValue({
      id: 1,
      name: "Anucha Wongchai",
      email: "anucha.wongchai@example.com",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValue({
      id: 20,
      requesterId: 1,
    } as any);

    // 1. Limit reached (already 5 active)
    vi.spyOn(prisma.attachment, "count").mockResolvedValue(5);

    const resLimit = await request(app)
      .post("/api/tickets/20/attachments")
      .set("X-Requester-Id", "1")
      .attach("file", Buffer.from("fake bytes"), "more.png");

    expect(resLimit.status).toBe(409);
    expect(resLimit.body.error.code).toBe("LIMIT_REACHED");

    // 2. Unsupported type (.exe / application/octet-stream)
    vi.spyOn(prisma.attachment, "count").mockResolvedValue(1);

    const resUnsupported = await request(app)
      .post("/api/tickets/20/attachments")
      .set("X-Requester-Id", "1")
      .attach("file", Buffer.from("malware bytes"), "virus.exe");

    expect(resUnsupported.status).toBe(415);
    expect(resUnsupported.body.error.code).toBe("UNSUPPORTED_TYPE");

    // 3. Oversize file (>5MB)
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024);
    const resOversize = await request(app)
      .post("/api/tickets/20/attachments")
      .set("X-Requester-Id", "1")
      .attach("file", largeBuffer, "huge_file.png");

    expect(resOversize.status).toBe(413);
    expect(resOversize.body.error.code).toBe("FILE_TOO_LARGE");
  });

  it("A-18: download streaming: active -> 200 binary bytes; soft-removed -> 410 REMOVED (FR-11, AC-11, BR-16)", async () => {
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValue({
      id: 1,
      name: "Anucha Wongchai",
      email: "anucha.wongchai@example.com",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const fileContent = Buffer.from("real pdf binary content");

    // 1. Active attachment download
    vi.spyOn(prisma.attachment, "findUnique").mockResolvedValueOnce({
      id: 301,
      ticketId: 25,
      filename: "manual.pdf",
      mimeType: "application/pdf",
      sizeBytes: fileContent.length,
      data: fileContent,
      uploadedAt: new Date(),
      removedAt: null,
      removedReason: null,
      ticket: { requesterId: 1 },
    } as any);

    const resActive = await request(app)
      .get("/api/attachments/301/download")
      .set("X-Requester-Id", "1");

    expect(resActive.status).toBe(200);
    expect(resActive.headers["content-type"]).toBe("application/pdf");
    expect(resActive.headers["content-disposition"]).toContain("manual.pdf");
    expect(resActive.body).toEqual(fileContent);

    // 2. Removed attachment download
    vi.spyOn(prisma.attachment, "findUnique").mockResolvedValueOnce({
      id: 302,
      ticketId: 25,
      filename: "secret.png",
      mimeType: "image/png",
      sizeBytes: 500,
      data: Buffer.from("png bytes"),
      uploadedAt: new Date(),
      removedAt: new Date(),
      removedReason: "Sensitive data",
      ticket: { requesterId: 1 },
    } as any);

    const resRemoved = await request(app)
      .get("/api/attachments/302/download")
      .set("X-Requester-Id", "1");

    expect(resRemoved.status).toBe(410);
    expect(resRemoved.body.error.code).toBe("REMOVED");
  });

  it("A-19: soft removal: missing reason -> 400; valid reason -> 200; repeat call -> 409 (FR-12, BR-16, BR-17, AC-12)", async () => {
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValue({
      id: 1,
      name: "Anucha Wongchai",
      email: "anucha.wongchai@example.com",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 1. Missing reason
    const resNoReason = await request(app)
      .delete("/api/attachments/401")
      .set("X-Requester-Id", "1")
      .send({ reason: "   " });

    expect(resNoReason.status).toBe(400);
    expect(resNoReason.body.error.code).toBe("VALIDATION_FAILED");

    // 2. Valid reason soft removal
    vi.spyOn(prisma.attachment, "findUnique").mockResolvedValueOnce({
      id: 401,
      ticketId: 30,
      filename: "old_log.txt",
      mimeType: "text/plain",
      sizeBytes: 100,
      uploadedAt: new Date(),
      removedAt: null,
      removedReason: null,
      ticket: { requesterId: 1 },
    } as any);

    const mockRemovedAt = new Date();
    vi.spyOn(prisma.attachment, "update").mockResolvedValueOnce({
      id: 401,
      ticketId: 30,
      filename: "old_log.txt",
      mimeType: "text/plain",
      sizeBytes: 100,
      uploadedAt: new Date(),
      removedAt: mockRemovedAt,
      removedReason: "Outdated log file",
    } as any);

    const resSuccess = await request(app)
      .delete("/api/attachments/401")
      .set("X-Requester-Id", "1")
      .send({ reason: "Outdated log file" });

    expect(resSuccess.status).toBe(200);
    expect(resSuccess.body.removed).toBe(true);
    expect(resSuccess.body.removedAt).toBeDefined();

    // 3. Repeat call -> 409 ALREADY_REMOVED
    vi.spyOn(prisma.attachment, "findUnique").mockResolvedValueOnce({
      id: 401,
      ticketId: 30,
      filename: "old_log.txt",
      mimeType: "text/plain",
      sizeBytes: 100,
      uploadedAt: new Date(),
      removedAt: mockRemovedAt,
      removedReason: "Outdated log file",
      ticket: { requesterId: 1 },
    } as any);

    const resRepeat = await request(app)
      .delete("/api/attachments/401")
      .set("X-Requester-Id", "1")
      .send({ reason: "Attempt second remove" });

    expect(resRepeat.status).toBe(409);
    expect(resRepeat.body.error.code).toBe("ALREADY_REMOVED");
  });

  it("A-20: metadata ownership: 200 for owner, 403 for other requester, 404 for unknown (BR-06)", async () => {
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValue({
      id: 1,
      name: "Anucha Wongchai",
      email: "anucha.wongchai@example.com",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 1. Owner 200
    vi.spyOn(prisma.attachment, "findUnique").mockResolvedValueOnce({
      id: 501,
      ticketId: 40,
      filename: "doc.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2000,
      uploadedAt: new Date(),
      removedAt: null,
      removedReason: null,
      ticket: { requesterId: 1 },
    } as any);

    const resOwner = await request(app)
      .get("/api/attachments/501")
      .set("X-Requester-Id", "1");

    expect(resOwner.status).toBe(200);
    expect(resOwner.body.attachment.id).toBe(501);

    // 2. Forbidden 403
    vi.spyOn(prisma.attachment, "findUnique").mockResolvedValueOnce({
      id: 502,
      ticketId: 40,
      filename: "doc.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2000,
      uploadedAt: new Date(),
      removedAt: null,
      removedReason: null,
      ticket: { requesterId: 2 }, // Other user
    } as any);

    const resForbidden = await request(app)
      .get("/api/attachments/502")
      .set("X-Requester-Id", "1");

    expect(resForbidden.status).toBe(403);
    expect(resForbidden.body.error.code).toBe("FORBIDDEN");

    // 3. Not found 404
    vi.spyOn(prisma.attachment, "findUnique").mockResolvedValueOnce(null);

    const resNotFound = await request(app)
      .get("/api/attachments/999")
      .set("X-Requester-Id", "1");

    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body.error.code).toBe("NOT_FOUND");
  });
});
