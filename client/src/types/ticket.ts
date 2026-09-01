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
