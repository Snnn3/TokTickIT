export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";
/**
 * The eight-value status vocabulary [BR-12]. Lab 2 had one value; CLOSED and
 * CANCELLED are terminal.
 */
export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

export const TICKET_STATUSES: TicketStatus[] = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];

/** Human-readable labels; the badge always shows text, never colour alone. */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: "NEW",
  OPEN: "OPEN",
  IN_PROGRESS: "IN PROGRESS",
  WAITING_FOR_REQUESTER: "WAITING FOR REQUESTER",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
  REOPENED: "REOPENED",
  CANCELLED: "CANCELLED",
};

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export interface AttachmentMetadata {
  id: number;
  ticketId: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  removedAt: string | null;
  removedReason: string | null;
}

export interface TicketSummaryItem {
  id: number;
  number: string;
  summary: string;
  categoryId: number;
  categoryName: string;
  requestedPriority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail {
  id: number;
  number: string;
  ticketDate: string;
  status: TicketStatus;
  requestedPriority: TicketPriority;
  summary: string;
  description: string;
  categoryId: number;
  systemId: number;
  requester: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  attachments: AttachmentMetadata[];
  /**
   * Lab 3 requester additions [FR-21, FR-28, D3]. Optional so the Lab 2
   * suites -- which build this shape without them -- keep compiling and
   * passing untouched; the detail screen treats absence as empty.
   */
  appearsResolvedAt?: string | null;
  resolutionSummary?: string | null;
  publicComments?: PublicComment[];
}

/**
 * A public discussion entry [FR-25, BR-14]. Author and timestamp are always
 * backend-set; the client never sends them and never renders raw HTML --
 * React escapes the body, whitespace is preserved with pre-wrap, and long
 * unbroken runs wrap with overflow-wrap: anywhere.
 */
export interface PublicComment {
  id: number;
  body: string;
  author: {
    id: number;
    name: string;
    role?: string;
  };
  createdAt: string;
}

/**
 * The staff queue owner filter [BR-16, ui-spec section 6]. Opt-in only: the
 * empty (All owners) default is not a validated value and is never sent, so
 * the queue opens on every ticket including unassigned ones [D12].
 */
export type QueueOwnerFilter = "assigned" | "unassigned" | "mine";

/**
 * One staff queue row [api-spec.md section 4]: who filed it, who owns it (or
 * an explicit null for unassigned), both urgencies, workflow status and the
 * appears-resolved signal. No description, notes or credential material.
 */
export interface StaffQueueTicket {
  id: number;
  number: string;
  summary: string;
  categoryId: number;
  categoryName: string;
  requestedPriority: TicketPriority;
  itPriority: TicketPriority;
  status: TicketStatus;
  requester: {
    id: number;
    name: string;
  };
  owner: {
    id: number;
    name: string;
  } | null;
  appearsResolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffQueueResponse {
  tickets: StaffQueueTicket[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
