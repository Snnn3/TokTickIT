import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

const mockRequester = {
  id: 1,
  name: "Anucha Wongchai",
  email: "anucha.wongchai@example.com",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("POST /api/tickets (Create Ticket API Tests - A-01..A-06)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Default mock for authentication middleware
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValue(mockRequester);
  });

  it("creates valid ticket and returns 201 with official number and status NEW (A-01, BR-01, BR-02, BR-12)", async () => {
    const mockCreatedTicket = {
      id: 10,
      number: "TKT-2026-00001",
      ticketDate: new Date("2026-09-01T10:00:00.000Z"),
      status: "NEW",
      requestedPriority: "MEDIUM",
      summary: "Cannot connect to campus Wi-Fi",
      description: "My laptop keeps dropping connection in building 3.",
      categoryId: 1,
      systemId: 2,
      requesterId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      const txMock = {
        category: {
          findFirst: vi.fn().mockResolvedValue({ id: 1, name: "Network", isActive: true }),
        },
        relatedSystem: {
          findFirst: vi.fn().mockResolvedValue({ id: 2, name: "Campus Wi-Fi", isActive: true }),
        },
        $queryRaw: vi.fn().mockResolvedValue([{ seq: 1n }]),
        ticket: {
          create: vi.fn().mockResolvedValue(mockCreatedTicket),
        },
        attachment: {
          create: vi.fn().mockResolvedValue({
            id: 101,
            filename: "screenshot.png",
            mimeType: "image/png",
            sizeBytes: 1234,
          }),
        },
      };
      return callback(txMock);
    });

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .field("summary", "Cannot connect to campus Wi-Fi")
      .field("description", "My laptop keeps dropping connection in building 3.")
      .field("categoryId", "1")
      .field("systemId", "2")
      .field("requestedPriority", "MEDIUM")
      .attach("files", Buffer.from("fake-image-bytes"), {
        filename: "screenshot.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(201);
    expect(res.body.ticket).toBeDefined();
    expect(res.body.ticket.number).toBe("TKT-2026-00001");
    expect(res.body.ticket.status).toBe("NEW");
    expect(res.body.ticket.requester.id).toBe(1);
    expect(res.body.ticket.attachments.length).toBe(1);
    expect(res.body.ticket.attachments[0].filename).toBe("screenshot.png");
  });

  it("returns 400 VALIDATION_FAILED when summary is missing (A-02, BR-07, AC-04)", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .field("summary", "   ")
      .field("description", "Valid description")
      .field("categoryId", "1")
      .field("systemId", "2")
      .field("requestedPriority", "LOW");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "summary" }),
      ])
    );
  });

  it("returns 400 when summary > 150 or description > 5000 chars (A-03, BR-07, BR-08, AC-05)", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .field("summary", "A".repeat(151))
      .field("description", "B".repeat(5001))
      .field("categoryId", "1")
      .field("systemId", "2")
      .field("requestedPriority", "LOW");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "summary" }),
        expect.objectContaining({ field: "description" }),
      ])
    );
  });

  it("returns 400 when category/system/priority are invalid (A-04, BR-09, BR-10, BR-11, AC-06)", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .field("summary", "Valid summary")
      .field("description", "Valid description")
      .field("categoryId", "invalid-id")
      .field("systemId", "-1")
      .field("requestedPriority", "CRITICAL");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(3);
  });

  it("returns 415 UNSUPPORTED_TYPE for disallowed file types (A-05, BR-13, AC-07)", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .field("summary", "Valid summary")
      .field("description", "Valid description")
      .field("categoryId", "1")
      .field("systemId", "2")
      .field("requestedPriority", "HIGH")
      .attach("files", Buffer.from("malicious-script"), {
        filename: "script.exe",
        contentType: "application/x-msdownload",
      });

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe("UNSUPPORTED_TYPE");
  });

  it("returns 400 when more than 5 files are attached (A-06, BR-13, AC-08)", async () => {
    const req = request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .field("summary", "Valid summary")
      .field("description", "Valid description")
      .field("categoryId", "1")
      .field("systemId", "2")
      .field("requestedPriority", "HIGH");

    for (let i = 1; i <= 6; i++) {
      req.attach("files", Buffer.from(`file content ${i}`), {
        filename: `image${i}.png`,
        contentType: "image/png",
      });
    }

    const res = await req;
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });
});
