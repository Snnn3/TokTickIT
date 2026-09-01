import type { TicketPriority, TicketStatus } from "../types/ticket";

const PRIORITY_BADGE_MAP: Record<TicketPriority, string> = {
  HIGH: "badge badge-zen-high",
  MEDIUM: "badge badge-zen-medium",
  LOW: "badge badge-zen-low",
};

const STATUS_BADGE_MAP: Record<TicketStatus, string> = {
  NEW: "badge badge-zen-new",
};

export function ZenPriorityBadge({ priority }: { priority: TicketPriority | string }) {
  const badgeClass =
    PRIORITY_BADGE_MAP[priority as TicketPriority] || "badge badge-zen-low";

  return (
    <span className={badgeClass} aria-label={`Priority: ${priority}`}>
      {priority}
    </span>
  );
}

export function ZenStatusBadge({ status }: { status: TicketStatus | string }) {
  const badgeClass =
    STATUS_BADGE_MAP[status as TicketStatus] || "badge badge-zen-new";

  return (
    <span className={badgeClass} aria-label={`Status: ${status}`}>
      {status}
    </span>
  );
}
