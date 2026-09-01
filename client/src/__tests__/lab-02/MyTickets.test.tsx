import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { MyTickets } from "../../components/MyTickets";
import { RequesterProvider } from "../../context/RequesterContext";

const mockRequester = {
  id: 1,
  name: "Anucha Wongchai",
  email: "anucha.wongchai@example.com",
};

const mockCategories = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];

const mockTickets = [
  {
    id: 101,
    number: "TKT-2026-00001",
    summary: "Wi-Fi connection issue in lab",
    categoryId: 1,
    categoryName: "Account and Access",
    systemId: 1,
    systemName: "Email",
    requestedPriority: "HIGH" as const,
    status: "NEW" as const,
    ticketDate: "2026-09-01T10:00:00.000Z",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:30:00.000Z",
  },
  {
    id: 102,
    number: "TKT-2026-00002",
    summary: "Printer jammed on 2nd floor",
    categoryId: 2,
    categoryName: "Hardware",
    systemId: 2,
    systemName: "Campus Wi-Fi",
    requestedPriority: "LOW" as const,
    status: "NEW" as const,
    ticketDate: "2026-09-01T11:00:00.000Z",
    createdAt: "2026-09-01T11:00:00.000Z",
    updatedAt: "2026-09-01T11:00:00.000Z",
  },
];

function AuthenticatedWrapper({ children }: { children: ReactNode }) {
  return <RequesterProvider>{children}</RequesterProvider>;
}

describe("MyTickets Component (C-07..C-12, FR-08, BR-19..BR-21, BR-24)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem(
      "toktickit_selected_requester",
      JSON.stringify(mockRequester)
    );

    // Default fetch mock
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/reference/categories")) {
        return {
          ok: true,
          json: async () => ({ categories: mockCategories }),
        } as Response;
      }
      if (url.includes("/api/tickets")) {
        return {
          ok: true,
          json: async () => ({
            tickets: mockTickets,
            page: 1,
            pageSize: 10,
            total: 2,
            totalPages: 1,
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
  });

  it("C-07: renders ticket rows with Zen Green badges, metadata, and actions", async () => {
    const onSelectTicket = vi.fn();
    render(
      <AuthenticatedWrapper>
        <MyTickets onSelectTicket={onSelectTicket} />
      </AuthenticatedWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-00001").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("TKT-2026-00002").length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText("Wi-Fi connection issue in lab").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Printer jammed on 2nd floor").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("HIGH").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("LOW").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("NEW").length).toBeGreaterThanOrEqual(2);

    // Click on ticket
    const viewButtons = screen.getAllByRole("button", { name: "View" });
    fireEvent.click(viewButtons[0]);
    expect(onSelectTicket).toHaveBeenCalledWith(101);
  });

  it("C-08: triggers search and updates query parameters with 300ms debounce (BR-19)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(
      <AuthenticatedWrapper>
        <MyTickets />
      </AuthenticatedWrapper>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search number or summary/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search number or summary/i);
    fireEvent.change(searchInput, { target: { value: "Printer" } });

    await waitFor(
      () => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining("search=Printer"),
          expect.anything()
        );
      },
      { timeout: 1000 }
    );
  });

  it("C-09: filters by category, priority, and status (BR-20)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(
      <AuthenticatedWrapper>
        <MyTickets />
      </AuthenticatedWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /Filter by category/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("combobox", { name: /Filter by category/i }), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /Filter by priority/i }), {
      target: { value: "HIGH" },
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("categoryId=2"),
        expect.anything()
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("priority=HIGH"),
        expect.anything()
      );
    });
  });

  it("C-10: supports pagination and page size selection (BR-21)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/reference/categories")) {
        return { ok: true, json: async () => ({ categories: mockCategories }) } as Response;
      }
      if (url.includes("/api/tickets")) {
        return {
          ok: true,
          json: async () => ({
            tickets: mockTickets,
            page: 1,
            pageSize: 10,
            total: 25,
            totalPages: 3,
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    render(
      <AuthenticatedWrapper>
        <MyTickets />
      </AuthenticatedWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId("pagination-page-info")).toHaveTextContent("Page 1 of 3 (25 tickets)");
    });

    // Click Next page
    const nextBtn = screen.getByRole("button", { name: /Next page/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
        expect.anything()
      );
    });

    // Change page size to 5
    const pageSizeSelect = screen.getByRole("combobox", { name: /Page size/i });
    fireEvent.change(pageSizeSelect, { target: { value: "5" } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("pageSize=5"),
        expect.anything()
      );
    });
  });

  it("C-11: distinguishes empty tickets state from no-results search state (BR-24)", async () => {
    // Empty state (no tickets in DB)
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/reference/categories")) {
        return { ok: true, json: async () => ({ categories: mockCategories }) } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          tickets: [],
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 0,
        }),
      } as Response;
    });

    render(
      <AuthenticatedWrapper>
        <MyTickets />
      </AuthenticatedWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId("empty-tickets-state")).toBeInTheDocument();
      expect(screen.getByText("No tickets yet")).toBeInTheDocument();
      expect(screen.getByText("Create your first ticket")).toBeInTheDocument();
    });

    // Type search to trigger no-results state
    fireEvent.change(screen.getByPlaceholderText(/Search number or summary/i), {
      target: { value: "nonexistent" },
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("no-results-state")).toBeInTheDocument();
        expect(screen.getByText("No tickets match your filters")).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it("C-12: clear filters button restores all filters back to default", async () => {
    render(
      <AuthenticatedWrapper>
        <MyTickets />
      </AuthenticatedWrapper>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search number or summary/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search number or summary/i);
    fireEvent.change(searchInput, { target: { value: "Test search" } });

    const clearBtn = screen.getByRole("button", { name: "Clear filters" });
    expect(clearBtn).not.toBeDisabled();
    expect(clearBtn).toHaveClass("btn-zen-tertiary");

    fireEvent.click(clearBtn);

    expect(searchInput).toHaveValue("");
    expect(clearBtn).toBeDisabled();
  });

  it("C-13: renders table and card skeletons during loading state (ui-spec §8)", async () => {
    let resolvePromise: (val: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/reference/categories")) {
        return { ok: true, json: async () => ({ categories: mockCategories }) } as Response;
      }
      return pendingPromise as Promise<Response>;
    });

    render(
      <AuthenticatedWrapper>
        <MyTickets />
      </AuthenticatedWrapper>
    );

    expect(screen.getByTestId("tickets-loading")).toBeInTheDocument();

    resolvePromise!({
      ok: true,
      json: async () => ({
        tickets: mockTickets,
        page: 1,
        pageSize: 10,
        total: 2,
        totalPages: 1,
      }),
    });

    await waitFor(() => {
      expect(screen.queryByTestId("tickets-loading")).not.toBeInTheDocument();
    });
  });
});
