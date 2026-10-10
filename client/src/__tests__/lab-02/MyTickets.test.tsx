import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { MyTickets } from "../../components/MyTickets";
import { AuthHarnessProvider, testUser } from "../../test/authHarness";

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

function CurrentLocation() {
  const location = useLocation();
  return (
    <output data-testid="current-location">
      {location.pathname}
      {location.search}
    </output>
  );
}

function AuthenticatedWrapper({
  children,
  route = "/tickets",
}: {
  children: ReactNode;
  route?: string;
}) {
  return (
    <MemoryRouter initialEntries={[route]}>
      <AuthHarnessProvider harness={{ user: testUser(mockRequester) }}>
        {children}
        <CurrentLocation />
      </AuthHarnessProvider>
    </MemoryRouter>
  );
}

describe("MyTickets Component (C-07..C-12, FR-08, BR-19..BR-21, BR-24)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
      expect(
        screen.getAllByText("TKT-2026-00001").length
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText("TKT-2026-00002").length
      ).toBeGreaterThanOrEqual(1);
    });

    expect(
      screen.getAllByText("Wi-Fi connection issue in lab").length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Printer jammed on 2nd floor").length
    ).toBeGreaterThanOrEqual(1);
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
      expect(
        screen.getByPlaceholderText(/Search number or summary/i)
      ).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      /Search number or summary/i
    );
    fireEvent.change(searchInput, { target: { value: "Printer" } });

    await waitFor(
      () => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining("search=Printer")
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
      expect(
        screen.getByRole("combobox", { name: /Filter by category/i })
      ).toBeInTheDocument();
    });

    fireEvent.change(
      screen.getByRole("combobox", { name: /Filter by category/i }),
      {
        target: { value: "2" },
      }
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: /Filter by priority/i }),
      {
        target: { value: "HIGH" },
      }
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("categoryId=2")
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("priority=HIGH")
      );
    });
  });

  it("C-10: supports pagination and page size selection (BR-21)", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
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
      expect(screen.getByTestId("pagination-page-info")).toHaveTextContent(
        "Page 1 of 3 (25 tickets)"
      );
    });

    // Click Next page
    const nextBtn = screen.getByRole("button", { name: /Next page/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("page=2"));
    });

    // Change page size to 5
    const pageSizeSelect = screen.getByRole("combobox", { name: /Page size/i });
    fireEvent.change(pageSizeSelect, { target: { value: "5" } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("pageSize=5")
      );
    });
  });

  it("C-11: distinguishes empty tickets state from no-results search state (BR-24)", async () => {
    // Empty state (no tickets in DB)
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/reference/categories")) {
        return {
          ok: true,
          json: async () => ({ categories: mockCategories }),
        } as Response;
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

    // Changing sort order with 0 tickets should still keep empty-tickets-state (BR-24)
    const sortSelect = screen.getByLabelText(/Sort by/i, {
      selector: "#sort-select",
    });
    fireEvent.change(sortSelect, { target: { value: "createdAt" } });
    await waitFor(() => {
      expect(screen.getByTestId("empty-tickets-state")).toBeInTheDocument();
    });

    // Type search to trigger no-results state
    fireEvent.change(screen.getByPlaceholderText(/Search number or summary/i), {
      target: { value: "nonexistent" },
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("no-results-state")).toBeInTheDocument();
        expect(
          screen.getByText("No tickets match your filters")
        ).toBeInTheDocument();
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
      expect(
        screen.getByPlaceholderText(/Search number or summary/i)
      ).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      /Search number or summary/i
    );
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
        return {
          ok: true,
          json: async () => ({ categories: mockCategories }),
        } as Response;
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

  it("loads fixed dashboard filters from the URL and clears them as one view", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <AuthenticatedWrapper route="/tickets?statusGroup=resolved&dateField=resolvedAt&from=2026-10-01T01%3A00%3A00.000Z&to=2026-10-08T01%3A00%3A00.000Z">
        <MyTickets />
      </AuthenticatedWrapper>
    );

    expect(
      await screen.findByTestId("ticket-dashboard-filters")
    ).toHaveTextContent("resolved");
    expect(screen.getByTestId("ticket-dashboard-filters")).toHaveTextContent(
      "1 Oct 2026, 08:00"
    );
    expect(screen.getByTestId("ticket-dashboard-filters")).toHaveTextContent(
      "(Bangkok)"
    );
    await waitFor(() => {
      const ticketRequest = fetchSpy.mock.calls
        .map(([input]) => String(input))
        .find((url) => url.startsWith("/api/tickets?"));
      expect(ticketRequest).toContain("statusGroup=resolved");
      expect(ticketRequest).toContain("dateField=resolvedAt");
      expect(ticketRequest).toContain("from=2026-10-01T01%3A00%3A00.000Z");
      expect(ticketRequest).toContain("to=2026-10-08T01%3A00%3A00.000Z");
    });
    expect(screen.getByTestId("ticket-fixed-sort")).toHaveTextContent(
      "Resolution time — newest first"
    );
    expect(screen.queryByLabelText("Sort by:")).toBeNull();

    await screen.findByRole("option", { name: "Hardware" });
    await user.selectOptions(screen.getByLabelText(/Filter by category/i), "2");
    await waitFor(() => {
      const currentUrl = screen.getByTestId("current-location").textContent;
      const params = new URLSearchParams(currentUrl?.split("?")[1]);
      expect(params.get("statusGroup")).toBe("resolved");
      expect(params.get("dateField")).toBe("resolvedAt");
      expect(params.get("from")).toBe("2026-10-01T01:00:00.000Z");
      expect(params.get("to")).toBe("2026-10-08T01:00:00.000Z");
      expect(params.get("categoryId")).toBe("2");
      expect(params.get("page")).toBe("1");
      expect(params.get("pageSize")).toBe("10");
    });

    fireEvent.click(
      screen.getAllByRole("button", { name: "Clear filters" })[0]
    );
    await waitFor(() => {
      expect(screen.queryByTestId("ticket-dashboard-filters")).toBeNull();
      const ticketRequests = fetchSpy.mock.calls
        .map(([input]) => String(input))
        .filter((url) => url.startsWith("/api/tickets?"));
      expect(ticketRequests.at(-1)).not.toContain("statusGroup=");
      expect(ticketRequests.at(-1)).not.toContain("dateField=");
    });
  });

  it("loads and visibly labels a dashboard status drill-down from the URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <AuthenticatedWrapper route="/tickets?status=WAITING_FOR_REQUESTER">
        <MyTickets />
      </AuthenticatedWrapper>
    );

    expect(
      await screen.findByTestId("ticket-dashboard-filters")
    ).toHaveTextContent("WAITING FOR REQUESTER");
    expect(
      screen.getByRole("combobox", { name: /Filter by status/i })
    ).toHaveValue("WAITING_FOR_REQUESTER");
    await waitFor(() => {
      const ticketRequest = fetchSpy.mock.calls
        .map(([input]) => String(input))
        .find((url) => url.startsWith("/api/tickets?"));
      expect(ticketRequest).toContain("status=WAITING_FOR_REQUESTER");
    });
  });

  it("keeps every active filter and the effective sort/page in the URL", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("/api/reference/categories")) {
          return {
            ok: true,
            json: async () => ({ categories: mockCategories }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({
            tickets: mockTickets,
            page: 1,
            pageSize: 5,
            total: 25,
            totalPages: 5,
          }),
        } as Response;
      });

    render(
      <AuthenticatedWrapper>
        <MyTickets />
      </AuthenticatedWrapper>
    );

    await screen.findByRole("option", { name: "Hardware" });
    await user.type(
      screen.getByPlaceholderText(/Search number or summary/i),
      "Printer"
    );
    await user.selectOptions(screen.getByLabelText(/Filter by category/i), "2");
    await user.selectOptions(
      screen.getByLabelText(/Filter by priority/i),
      "HIGH"
    );
    await user.selectOptions(
      screen.getByLabelText(/Filter by status/i),
      "OPEN"
    );
    await user.selectOptions(screen.getByLabelText("Sort by:"), "createdAt");
    await user.selectOptions(screen.getByLabelText("Sort order"), "asc");
    await user.selectOptions(
      screen.getByRole("combobox", { name: /page size/i }),
      "5"
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled()
    );
    await user.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() => {
      const currentUrl = screen.getByTestId("current-location").textContent;
      const params = new URLSearchParams(currentUrl?.split("?")[1]);
      expect(params.get("search")).toBe("Printer");
      expect(params.get("categoryId")).toBe("2");
      expect(params.get("priority")).toBe("HIGH");
      expect(params.get("status")).toBe("OPEN");
      expect(params.get("sort")).toBe("createdAt");
      expect(params.get("order")).toBe("asc");
      expect(params.get("page")).toBe("2");
      expect(params.get("pageSize")).toBe("5");
    });

    await waitFor(() => {
      const ticketRequest = fetchSpy.mock.calls
        .map(([input]) => String(input))
        .filter((url) => url.startsWith("/api/tickets?"))
        .at(-1);
      expect(ticketRequest).toContain("search=Printer");
      expect(ticketRequest).toContain("categoryId=2");
      expect(ticketRequest).toContain("priority=HIGH");
      expect(ticketRequest).toContain("status=OPEN");
      expect(ticketRequest).toContain("sort=createdAt");
      expect(ticketRequest).toContain("order=asc");
      expect(ticketRequest).toContain("page=2");
      expect(ticketRequest).toContain("pageSize=5");
    });
  });
});
