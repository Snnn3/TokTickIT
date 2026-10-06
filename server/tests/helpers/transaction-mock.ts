import { vi } from "vitest";
import { prisma } from "../../src/prisma";

export function installPassThroughTicketTransactionMock(): void {
  vi.spyOn(prisma, "$transaction").mockImplementation((async (
    callback: (tx: object) => Promise<unknown>
  ) =>
    callback({
      $queryRaw: vi.fn().mockResolvedValue([]),
      ticket: {
        findUnique: (args: unknown) => prisma.ticket.findUnique(args as never),
        updateMany: (args: unknown) => prisma.ticket.updateMany(args as never),
      },
    })) as never);
}
