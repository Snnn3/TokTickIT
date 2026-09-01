import type { TicketPriority, TicketStatus } from "../types/ticket";

export function ZenPriorityBadge({ priority }: { priority: TicketPriority | string }) {
  let badgeClass = "badge badge-zen-low";
  if (priority === "HIGH") {
    badgeClass = "badge badge-zen-high";
  } else if (priority === "MEDIUM") {
    badgeClass = "badge badge-zen-medium";
  }

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
