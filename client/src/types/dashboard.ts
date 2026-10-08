import type { TicketPriority, TicketStatus } from "./ticket";
import type { ActionSummary } from "./action";

export interface StaffDashboardTicket {
  id: number;
  number: string;
  summary: string;
  status: TicketStatus;
  requestedPriority: TicketPriority;
  itPriority: TicketPriority;
  owner: {
    id: number;
    name: string;
    role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
    isActive: boolean;
  } | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface StaffDashboardResponse {
  asOf: string;
  windowDays: 7;
  metrics: {
    openTickets: number;
    unassignedTickets: number;
    myOwnedTickets: number;
    myActiveActions: number;
  };
  lists: {
    recentTickets: StaffDashboardTicket[];
    myRecentActions: ActionSummary[];
  };
}
