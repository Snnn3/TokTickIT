import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

describe("Ticket Detail API (A-14, A-15, FR-09, FR-13, BR-06, AC-03)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("A-14: enforces ownership: 200 for owner, 403 for other requester, 404 for missing (AC-03, BR-06)", async () => {
    // Authenticated user
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValue({
      id: 1,
      name: "Anucha Wongchai",
      email: "anucha.wongchai@example.com",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 1. Success path: Owner retrieves ticket
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValueOnce({
      id: 10,
      number: "TKT-2026-00010",
      summary: "Cannot access network drive",
      description: "Getting permission denied on Z: drive",
      categoryId: 1,
      systemId: 2,
      requestedPriority: "MEDIUM",
      status: "NEW",
      requesterId: 1,
      ticketDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      category: { name: "Network" },
      system: { name: "File Server" },
      requester: { id: 1, name: "Anucha Wongchai", email: "anucha@example.com" },
      attachments: [],
    } as any);

    const resOwner = await request(app)
      .get("/api/tickets/10")
      .set("X-Requester-Id", "1");

    expect(resOwner.status).toBe(200);
    expect(resOwner.body.ticket.id).toBe(10);
    expect(resOwner.body.ticket.number).toBe("TKT-2026-00010");

    // 2. Forbidden path: Other requester retrieves ticket
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValueOnce({
      id: 10,
      number: "TKT-2026-00010",
      summary: "Cannot access network drive",
      description: "Getting permission denied on Z: drive",
      categoryId: 1,
      systemId: 2,
      requestedPriority: "MEDIUM",
      status: "NEW",
      requesterId: 2, // Belonging to user 2
      ticketDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      category: { name: "Network" },
      system: { name: "File Server" },
      requester: { id: 2, name: "Other User", email: "other@example.com" },
      attachments: [],
    } as any);

    const resForbidden = await request(app)
      .get("/api/tickets/10")
      .set("X-Requester-Id", "1");

    expect(resForbidden.status).toBe(403);
    expect(resForbidden.body.error.code).toBe("FORBIDDEN");

    // 3. Not found path: Unknown ticket id
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValueOnce(null);

    const resNotFound = await request(app)
      .get("/api/tickets/999")
      .set("X-Requester-Id", "1");

    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body.error.code).toBe("NOT_FOUND");

    // 4. Invalid ID path
    const resInvalidId = await request(app)
      .get("/api/tickets/abc")
      .set("X-Requester-Id", "1");

    expect(resInvalidId.status).toBe(400);
    expect(resInvalidId.body.error.code).toBe("INVALID_ID");
  });

  it("A-15: returns complete detail payload including read-only fields and attachment metadata (FR-09)", async () => {
    vi.spyOn(prisma.requesterUser, "findFirst").mockResolvedValue({
      id: 1,
      name: "Anucha Wongchai",
      email: "anucha.wongchai@example.com",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockDate = new Date("2026-08-30T10:00:00.000Z");
    vi.spyOn(prisma.ticket, "findUnique").mockResolvedValueOnce({
      id: 15,
      number: "TKT-2026-00015",
      summary: "Broken keyboard key",
      description: "Spacebar stuck",
      categoryId: 2,
      systemId: 3,
      requestedPriority: "HIGH",
      status: "NEW",
      requesterId: 1,
      ticketDate: mockDate,
      createdAt: mockDate,
      updatedAt: mockDate,
      category: { name: "Hardware" },
      system: { name: "Workstation" },
      requester: { id: 1, name: "Anucha Wongchai", email: "anucha@example.com" },
      attachments: [
        {
          id: 101,
          ticketId: 15,
          filename: "keyboard_photo.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 102400,
          uploadedAt: mockDate,
          removedAt: null,
          removedReason: null,
        },
      ],
    } as any);

    const res = await request(app)
      .get("/api/tickets/15")
      .set("X-Requester-Id", "1");

    expect(res.status).toBe(200);
    expect(res.body.ticket).toMatchObject({
      id: 15,
      number: "TKT-2026-00015",
      summary: "Broken keyboard key",
      description: "Spacebar stuck",
      categoryId: 2,
      systemId: 3,
      requestedPriority: "HIGH",
      status: "NEW",
      requester: {
        id: 1,
        name: "Anucha Wongchai",
      },
      attachments: [
        {
          id: 101,
          ticketId: 15,
          filename: "keyboard_photo.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 102400,
          removedAt: null,
          removedReason: null,
        },
      ],
    });
  });
});
