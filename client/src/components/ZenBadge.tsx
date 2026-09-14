import type { TicketPriority, TicketStatus } from "../types/ticket";
import { TICKET_STATUS_LABELS } from "../types/ticket";

const PRIORITY_BADGE_MAP: Record<TicketPriority, string> = {
  HIGH: "badge badge-zen-high",
  MEDIUM: "badge badge-zen-medium",
  LOW: "badge badge-zen-low",
};

/**
 * Status badges across the eight-value vocabulary [BR-12, ui-spec section 1].
 *
 * The live statuses run up the pale-to-green scale, Resolved uses the success
 * tint, and the two terminal statuses are deliberately neutral grey so a closed
 * or cancelled ticket does not read as active work. Every badge carries its
 * label as text, so colour is never the only indicator.
 */
const STATUS_BADGE_MAP: Record<TicketStatus, string> = {
  NEW: "badge badge-zen-new",
  OPEN: "badge badge-zen-open",
  IN_PROGRESS: "badge badge-zen-in-progress",
  WAITING_FOR_REQUESTER: "badge badge-zen-waiting",
  REOPENED: "badge badge-zen-reopened",
  RESOLVED: "badge badge-zen-resolved",
  CLOSED: "badge badge-zen-terminal",
  CANCELLED: "badge badge-zen-terminal",
};

export function ZenPriorityBadge({
  priority,
}: {
  priority: TicketPriority | string;
}) {
  const badgeClass =
    PRIORITY_BADGE_MAP[priority as TicketPriority] || "badge badge-zen-low";

  return (
    <span aria-label={`Priority: ${priority}`} className={badgeClass}>
      {priority}
    </span>
  );
}

/** IT Priority reuses the same scale with an `IT` prefix (ui-spec section 1). */
export function ZenItPriorityBadge({
  priority,
}: {
  priority: TicketPriority | string;
}) {
  const badgeClass =
    PRIORITY_BADGE_MAP[priority as TicketPriority] || "badge badge-zen-low";

  return (
    <span aria-label={`IT Priority: ${priority}`} className={badgeClass}>
      IT · {priority}
    </span>
  );
}

export function ZenStatusBadge({ status }: { status: TicketStatus | string }) {
  const badgeClass =
    STATUS_BADGE_MAP[status as TicketStatus] || "badge badge-zen-new";
  const label = TICKET_STATUS_LABELS[status as TicketStatus] ?? String(status);

  return (
    <span aria-label={`Status: ${label}`} className={badgeClass}>
      {label}
    </span>
  );
}
