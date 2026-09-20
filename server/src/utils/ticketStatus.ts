import { TicketStatus } from "@prisma/client";

/**
 * The eight-value status vocabulary [BR-12].
 *
 * Derived from the Prisma enum rather than restated, so the schema stays the
 * single source of truth and a value added there cannot be silently missing
 * from query validation. Lab 2 hard-coded the single permitted value in three
 * separate places; this exists so that cannot happen again.
 */
export const TICKET_STATUSES = Object.values(TicketStatus);

/** Closed and Cancelled admit no further transition [BR-12, BR-13]. */
export const TERMINAL_TICKET_STATUSES: TicketStatus[] = [
  TicketStatus.CLOSED,
  TicketStatus.CANCELLED,
];

export function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as string[]).includes(value);
}
