import { describe, it, expect, vi } from "vitest";
import { generateTicketNumber } from "../../src/utils/ticketNumber";
import { Prisma } from "@prisma/client";

describe("generateTicketNumber (U-01, BR-01, AC-01)", () => {
  it("formats ticket number as TKT-{year}-{5-digit sequence}", async () => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValueOnce([{ seq: 1n }]),
    } as unknown as Prisma.TransactionClient;

    const ticketNumber = await generateTicketNumber(mockTx, 2026);
    expect(ticketNumber).toBe("TKT-2026-00001");
    expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);
  });

  it("pads monotonic sequence correctly for larger numbers", async () => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValueOnce([{ seq: 1234n }]),
    } as unknown as Prisma.TransactionClient;

    const ticketNumber = await generateTicketNumber(mockTx, 2026);
    expect(ticketNumber).toBe("TKT-2026-01234");
  });

  it("produces unique numbers on successive calls", async () => {
    const mockTx = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ seq: 42n }])
        .mockResolvedValueOnce([{ seq: 43n }]),
    } as unknown as Prisma.TransactionClient;

    const num1 = await generateTicketNumber(mockTx, 2026);
    const num2 = await generateTicketNumber(mockTx, 2026);

    expect(num1).toBe("TKT-2026-00042");
    expect(num2).toBe("TKT-2026-00043");
    expect(num1).not.toBe(num2);
  });
});
