import type { TicketPriority, TicketStatus } from "../types/ticket";

const PRIORITY_BADGE_MAP: Record<TicketPriority, string> = {
  HIGH: "badge badge-zen-high",
  MEDIUM: "badge badge-zen-medium",
  LOW: "badge badge-zen-low",
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
  return (
    <span className="badge badge-zen-new" aria-label={`Status: ${status}`}>
      {status}
    </span>
  );
}
