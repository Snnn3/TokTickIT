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
}
