import { Prisma } from "@prisma/client";

/**
 * Generates official ticket number formatted as TKT-{year}-{5-digit sequence}
 * Uses PostgreSQL sequence 'ticket_number_seq' inside a database transaction [BR-01, D1].
 */
export async function generateTicketNumber(
  tx: Prisma.TransactionClient,
  year: number = new Date().getUTCFullYear(),
): Promise<string> {
  const result = await tx.$queryRaw<{ seq: bigint }[]>`SELECT nextval('ticket_number_seq') AS seq`;
  const seq = Number(result[0].seq);
  const padded = String(seq).padStart(5, "0");
  return `TKT-${year}-${padded}`;
}
