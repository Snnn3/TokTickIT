import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { RequesterTicketDetail } from "../../components/RequesterTicketDetail";
import type { TicketDetail } from "../../types/ticket";

const mockTicketDetail: TicketDetail = {
  id: 42,
  number: "TKT-2026-00042",
  summary: "VPN disconnecting randomly",
  description: "Every 10 minutes the VPN connection drops.\nPlease investigate firewall logs.",
  categoryId: 4,
  systemId: 2,
  requestedPriority: "HIGH",
  status: "NEW",
  requester: {
    id: 1,
    name: "Anucha Wongchai",
  },
  ticketDate: "2026-08-30T09:00:00.000Z",
  createdAt: "2026-08-30T09:00:00.000Z",
  updatedAt: "2026-08-30T10:30:00.000Z",
  attachments: [
    {
      id: 1,
      ticketId: 42,
      filename: "vpn_log.txt",
      mimeType: "text/plain",
      sizeBytes: 2048,
      uploadedAt: "2026-08-30T09:05:00.000Z",
      removedAt: null,
      removedReason: null,
    },
  ],
};

describe("RequesterTicketDetail Component (C-10, AC-23, FR-09, BR-06)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("C-10: renders read-only ticket info with distinct shading and no editable controls (AC-23)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/reference/categories")) {
        return {
          ok: true,
          json: async () => ({ categories: [{ id: 4, name: "Network" }] }),
        } as Response;
      }
      if (url.includes("/api/reference/systems")) {
        return {
          ok: true,
          json: async () => ({ systems: [{ id: 2, name: "Corporate VPN" }] }),
        } as Response;
      }
      if (url.includes("/api/tickets/42")) {
        return {
          ok: true,
          json: async () => ({ ticket: mockTicketDetail }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });

    const onBack = vi.fn();

    render(
      <RequesterTicketDetail
        ticketId={42}
        requesterId={1}
        onBack={onBack}
      />,
    );

    // Initial loading skeleton state
    expect(screen.getByTestId("ticket-detail-loading")).toBeInTheDocument();

    // After loading, detail view is rendered
    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
    });

    // Check header and metadata fields
    expect(screen.getByTestId("ticket-detail-number")).toHaveTextContent("TKT-2026-00042");
    expect(screen.getByText("Network")).toBeInTheDocument();
    expect(screen.getByText("Corporate VPN")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getAllByText("NEW").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("ticket-detail-summary")).toHaveTextContent("VPN disconnecting randomly");

    // Check whitespace preserved in description
    const descEl = screen.getByTestId("ticket-detail-description");
    expect(descEl).toHaveTextContent("Every 10 minutes the VPN connection drops.");
    expect(descEl).toHaveStyle({ whiteSpace: "pre-wrap" });

    // Verify view mode only: no editable input or textarea for ticket fields
    expect(screen.queryByRole("textbox", { name: /summary/i })).not.toBeInTheDocument();

    // Verify meta footer created and updated timestamps (ui-spec §9)
    const metaFooter = screen.getByTestId("ticket-detail-meta-footer");
    expect(metaFooter).toHaveTextContent(/Created:/);
    expect(metaFooter).toHaveTextContent(/Last Updated:/);

    // Back navigation button works
    const backBtn = screen.getByTestId("back-to-tickets-btn");
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("handles 403 Forbidden or 404 Not Found error states cleanly", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/tickets/99")) {
        return {
          ok: false,
          status: 403,
          json: async () => ({ error: { code: "FORBIDDEN", message: "Access denied" } }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ categories: [], systems: [] }),
      } as Response;
    });

    render(
      <RequesterTicketDetail
        ticketId={99}
        requesterId={1}
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-error")).toBeInTheDocument();
      expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
    });
  });
});
