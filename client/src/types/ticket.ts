export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";
export type TicketStatus = "NEW";

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
