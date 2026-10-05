import type { Prisma } from "@prisma/client";

/**
 * Serializes Action assignment writes with user eligibility changes. Every
 * caller locks User rows first, then parent Ticket rows, in ascending ID order.
 */
export async function lockActionAssignmentRows(
  tx: Prisma.TransactionClient,
  userIds: readonly (number | null | undefined)[],
  ticketIds: readonly number[]
): Promise<void> {
  const orderedUserIds = [...new Set(userIds.filter((id) => id != null))].sort(
    (left, right) => left - right
  );
  for (const id of orderedUserIds) {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`;
  }

  const orderedTicketIds = [...new Set(ticketIds)].sort(
    (left, right) => left - right
  );
  for (const id of orderedTicketIds) {
    await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${id} FOR UPDATE`;
  }
}
