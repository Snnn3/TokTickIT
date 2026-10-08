import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { StaffTicketQueue } from "../../components/StaffTicketQueue";
import { AuthHarnessProvider, testUser } from "../../test/authHarness";

/**
 * C-03 from tests.md (AC-08) plus the queue half of S-02 (AC-18).
 *
 * The staff queue wiring: debounced search, the five filters with the owner
 * select defaulting to All, sort, pagination, per-row content (requester,
 * owner-or-Unassigned, both priorities, status, appears-resolved badge) and
 * the open-detail action -- with loading, empty, no-results, forbidden and
 * failure states each rendering distinguishable content.
 *
 * Same seam as the Lab 2 list suite: the component rendered directly with
 * `fetch` mocked. Identity travels in the session cookie, so the harness only
 * supplies a staff user for context readers.
 */

const mockCategories = [{ id: 1, name: "Network" }];

const mockQueueTickets = [
  {
    id: 11,
    number: "TKT-2026-00011",
    summary: "Email client shows certificate warning",
    categoryId: 1,
    categoryName: "Network",
    requestedPriority: "MEDIUM",
    itPriority: "HIGH",
    status: "OPEN",
    requester: { id: 2, name: "Busaba Srisawat" },
    owner: { id: 9, name: "Kittipong Saelim" },
    appearsResolvedAt: null,
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-02T10:00:00.000Z",
  },
  {
    id: 12,
    number: "TKT-2026-00012",
    summary: "Cannot connect to campus Wi-Fi in Building 3",
    categoryId: 1,
    categoryName: "Network",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    status: "NEW",
    requester: { id: 1, name: "Anucha Wongchai" },
    owner: null,
    appearsResolvedAt: "2026-09-12T08:00:00.000Z",
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-01T09:30:00.000Z",
  },
];

function mockQueueApi(
  tickets: unknown[] = mockQueueTickets,
  options: { status?: number; total?: number; totalPages?: number } = {}
) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/api/reference/categories")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ categories: mockCategories }),
      } as Response;
    }
    if (url.includes("/api/reference/systems")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ systems: [] }),
      } as Response;
    }
    if (url.includes("/api/staff/tickets")) {
      const status = options.status ?? 200;
      if (status !== 200) {
        return {
          ok: false,
          status,
          json: async () => ({
            error: {
              code: status === 403 ? "FORBIDDEN" : "UNEXPECTED",
              message:
                status === 403
                  ? "Your role does not permit this operation"
                  : "Failed to retrieve the ticket queue",
            },
          }),
        } as Response;
      }
      const list = tickets as typeof mockQueueTickets;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          tickets: list,
          page: 1,
          pageSize: 10,
          total: options.total ?? list.length,
          totalPages: options.totalPages ?? (list.length === 0 ? 0 : 1),
        }),
      } as Response;
    }
    return { ok: true, status: 200, json: async () => ({}) } as Response;
  });
}

function StaffWrapper({
  children,
  initialEntry = "/staff/queue",
}: {
  children: ReactNode;
  initialEntry?: string;
}) {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthHarnessProvider
        harness={{ user: testUser({ id: 9, role: "IT_STAFF" }) }}
      >
        {children}
      </AuthHarnessProvider>
    </MemoryRouter>
  );
}

async function renderQueue(
  onSelectTicket = vi.fn(),
  initialEntry = "/staff/queue"
) {
  render(
    <StaffWrapper initialEntry={initialEntry}>
      <StaffTicketQueue onSelectTicket={onSelectTicket} />
    </StaffWrapper>
  );
  await waitFor(() => {
    expect(screen.getByTestId("staff-queue-view")).toBeInTheDocument();
  });
  return { onSelectTicket };
}

describe("StaffTicketQueue wiring (C-03, AC-08)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockQueueApi();
  });

  it("renders the toolbar with search, five filters, sort and pagination", async () => {
    await renderQueue();

    expect(
      screen.getByPlaceholderText(/Search number or summary/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /Filter by status/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /Filter by category/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /Filter by requested priority/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /Filter by IT priority/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /Filter by owner/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId("pagination-page-info")).toHaveTextContent(
      "Page 1 of 1 (2 tickets)"
    );
  });

  it("restores all queue choices and a filtered second page from its URL", async () => {
    const fetchSpy = mockQueueApi(undefined, { total: 12, totalPages: 3 });
    await renderQueue(
      vi.fn(),
      "/staff/queue?statusGroup=open&owner=mine&search=wifi&categoryId=1&requestedPriority=MEDIUM&itPriority=HIGH&sort=number&order=asc&page=2&pageSize=5"
    );
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/Search number or summary/i)
      ).toHaveValue("wifi")
    );
    expect(screen.getByLabelText("Filter by category")).toHaveValue("1");
    expect(screen.getByLabelText("Filter by requested priority")).toHaveValue(
      "MEDIUM"
    );
    expect(screen.getByLabelText("Filter by IT priority")).toHaveValue("HIGH");
    expect(screen.getByLabelText("Sort by:")).toHaveValue("number");
    expect(screen.getByLabelText("Sort order")).toHaveValue("asc");
    expect(screen.getByTestId("pagination-page-info")).toHaveTextContent(
      "Page 2 of 3"
    );
    await waitFor(() => {
      const lastQueue = fetchSpy.mock.calls
        .map(([url]) => String(url))
        .filter((url) => url.includes("/api/staff/tickets"))
        .at(-1)!;
      const params = new URL(lastQueue, "http://localhost").searchParams;
      expect(Object.fromEntries(params)).toMatchObject({
        search: "wifi",
        categoryId: "1",
        requestedPriority: "MEDIUM",
        itPriority: "HIGH",
        sort: "number",
        order: "asc",
        page: "2",
        pageSize: "5",
        owner: "mine",
        statusGroup: "open",
      });
    });
  });

  it("defaults the owner filter to All owners so unassigned work stays visible (D12)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await renderQueue();

    const ownerSelect = screen.getByRole("combobox", {
      name: /Filter by owner/i,
    }) as HTMLSelectElement;
    expect(ownerSelect.value).toBe("");
    expect(ownerSelect).toHaveDisplayValue("All owners");

    // The default request carries no owner param at all.
    await waitFor(() => {
      const queueCalls = fetchSpy.mock.calls
        .map(([input]) => String(input))
        .filter((url) => url.includes("/api/staff/tickets"));
      expect(queueCalls.length).toBeGreaterThanOrEqual(1);
      expect(queueCalls[0]).not.toContain("owner=");
    });
  });

  it("offers assigned, mine and unassigned in the owner select and queries each value", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await renderQueue();

    const ownerSelect = screen.getByRole("combobox", {
      name: /Filter by owner/i,
    });
    const options = Array.from((ownerSelect as HTMLSelectElement).options).map(
      (option) => option.textContent
    );
    expect(options).toEqual([
      "All owners",
      "Assigned to anyone",
      "Assigned to me",
      "Unassigned",
    ]);

    fireEvent.change(ownerSelect, { target: { value: "mine" } });
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("owner=mine")
      );
    });

    fireEvent.change(ownerSelect, { target: { value: "unassigned" } });
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("owner=unassigned")
      );
    });

    fireEvent.change(ownerSelect, { target: { value: "assigned" } });
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("owner=assigned")
      );
    });
  });

  it("debounces the search before querying number or summary", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await renderQueue();

    fireEvent.change(screen.getByPlaceholderText(/Search number or summary/i), {
      target: { value: "TKT-2026-00011" },
    });

    await waitFor(
      () => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining("search=TKT-2026-00011")
        );
      },
      { timeout: 1000 }
    );
  });

  it("shows requester, owner-or-Unassigned, both priorities, status and the signal badge per row", async () => {
    await renderQueue();

    // Rows arrive one fetch after the shell; wait for them first.
    await waitFor(() => {
      expect(screen.getAllByTestId("queue-row").length).toBeGreaterThanOrEqual(
        1
      );
    });

    // Who filed each ticket.
    expect(
      screen.getAllByText("Busaba Srisawat").length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Anucha Wongchai").length
    ).toBeGreaterThanOrEqual(1);
    // Who owns it, or the explicit unassigned marker.
    expect(
      screen.getAllByText("Kittipong Saelim").length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThanOrEqual(1);
    // Both urgencies: requested MEDIUM and operational IT HIGH.
    expect(screen.getAllByText("MEDIUM").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("IT · HIGH").length).toBeGreaterThanOrEqual(1);
    // Status badge text.
    expect(screen.getAllByText("OPEN").length).toBeGreaterThanOrEqual(1);
    // The appears-resolved indicator rides only on the signalled row.
    const badges = screen.getAllByText("REQUESTER SAYS FIXED");
    expect(badges.length).toBeGreaterThanOrEqual(1);
    for (const badge of badges) {
      expect(badge.className).toContain("badge-zen-appears-resolved");
    }
  });

  it("opens the ticket detail from a row action", async () => {
    const { onSelectTicket } = await renderQueue();

    const openButtons = await screen.findAllByRole("button", { name: "Open" });
    fireEvent.click(openButtons[0]);
    expect(onSelectTicket).toHaveBeenCalledWith(11);
  });

  it("clears every filter back to the unfiltered default", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await renderQueue();

    fireEvent.change(screen.getByPlaceholderText(/Search number or summary/i), {
      target: { value: "wifi" },
    });
    fireEvent.change(
      screen.getByRole("combobox", { name: /Filter by owner/i }),
      {
        target: { value: "mine" },
      }
    );

    const clearButton = screen.getByRole("button", { name: "Clear filters" });
    expect(clearButton).not.toBeDisabled();
    fireEvent.click(clearButton);

    expect(
      screen.getByPlaceholderText(/Search number or summary/i)
    ).toHaveValue("");
    expect(
      screen.getByRole("combobox", { name: /Filter by owner/i })
    ).toHaveValue("");
    await waitFor(() => {
      const queueCalls = fetchSpy.mock.calls
        .map(([input]) => String(input))
        .filter((url) => url.includes("/api/staff/tickets"));
      const last = queueCalls[queueCalls.length - 1];
      expect(last).not.toContain("search=");
      expect(last).not.toContain("owner=");
    });
  });

  it("restores dashboard drill-down filters from the URL and lets the user clear them", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await renderQueue(
      vi.fn(),
      "/staff/queue?statusGroup=open&owner=unassigned&dateField=updatedAt&from=2026-10-01T00%3A00%3A00.000Z&to=2026-10-08T00%3A00%3A00.000Z"
    );

    await waitFor(() => {
      const queueCalls = fetchSpy.mock.calls
        .map(([input]) => String(input))
        .filter((url) => url.includes("/api/staff/tickets"));
      expect(queueCalls.at(-1)).toContain("statusGroup=open");
      expect(queueCalls.at(-1)).toContain("dateField=updatedAt");
      expect(queueCalls.at(-1)).toContain("owner=unassigned");
      expect(queueCalls.at(-1)).not.toContain("sort=");
      expect(queueCalls.at(-1)).not.toContain("order=");
    });
    expect(screen.getByTestId("queue-dashboard-filters")).toHaveTextContent(
      "Open tickets"
    );
    expect(screen.getByTestId("queue-dashboard-filters")).toHaveTextContent(
      "Owner: unassigned"
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => {
      expect(screen.queryByTestId("queue-dashboard-filters")).toBeNull();
      const queueCalls = fetchSpy.mock.calls
        .map(([input]) => String(input))
        .filter((url) => url.includes("/api/staff/tickets"));
      expect(queueCalls.at(-1)).not.toContain("statusGroup=");
      expect(queueCalls.at(-1)).not.toContain("dateField=");
      expect(queueCalls.at(-1)).not.toContain("owner=");
    });
  });
});

describe("StaffTicketQueue states (S-02, AC-18)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading skeletons while the queue is in flight", async () => {
    let resolveQueue!: (value: unknown) => void;
    const gate = new Promise((resolve) => {
      resolveQueue = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/reference/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ categories: [], systems: [] }),
        } as Response;
      }
      return gate as Promise<Response>;
    });

    render(
      <StaffWrapper>
        <StaffTicketQueue />
      </StaffWrapper>
    );

    expect(screen.getByTestId("queue-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("queue-empty")).toBeNull();
    expect(screen.queryByTestId("queue-no-results")).toBeNull();

    resolveQueue({
      ok: true,
      status: 200,
      json: async () => ({
        tickets: [],
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      }),
    });
    await waitFor(() => {
      expect(screen.queryByTestId("queue-loading")).not.toBeInTheDocument();
    });
  });

  it("distinguishes the empty queue from a filtered no-results queue", async () => {
    mockQueueApi([]);
    await renderQueue();

    // No filters active: the queue itself is empty.
    expect(screen.getByTestId("queue-empty")).toBeInTheDocument();
    expect(screen.getByText("No tickets in queue")).toBeInTheDocument();
    expect(screen.queryByTestId("queue-no-results")).toBeNull();

    // Adding a filter with the same zero rows: nothing matches instead.
    fireEvent.change(screen.getByPlaceholderText(/Search number or summary/i), {
      target: { value: "nothing-matches-this" },
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("queue-no-results")).toBeInTheDocument();
        expect(
          screen.getByText("No tickets match your filters")
        ).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
    expect(screen.queryByTestId("queue-empty")).toBeNull();
  });

  it("renders a forbidden panel for a Requester-role caller", async () => {
    mockQueueApi([], { status: 403 });
    await renderQueue();

    expect(screen.getByTestId("queue-forbidden")).toBeInTheDocument();
    expect(screen.getByTestId("queue-forbidden")).toHaveTextContent(
      /do not have access/i
    );
    expect(screen.queryByTestId("queue-loading")).toBeNull();
    expect(screen.queryByTestId("queue-failure")).toBeNull();
    expect(screen.queryByTestId("queue-empty")).toBeNull();
  });

  it("renders a failure banner with a Retry that preserves the current query", async () => {
    const fetchSpy = mockQueueApi([], { status: 500 });
    await renderQueue();

    // Search first so the retry has a query worth preserving.
    fireEvent.change(screen.getByPlaceholderText(/Search number or summary/i), {
      target: { value: "wifi" },
    });
    await waitFor(
      () => {
        expect(screen.getByTestId("queue-failure")).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
    expect(screen.queryByTestId("queue-forbidden")).toBeNull();

    const callsBefore = fetchSpy.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => {
      expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsBefore);
      const last = String(
        fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1][0]
      );
      expect(last).toContain("search=wifi");
    });
  });
});

describe("StaffTicketQueue response ordering", () => {
  beforeEach(() => vi.restoreAllMocks());

  function deferredResponse() {
    let resolve!: (response: Response) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<Response>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    return { promise, resolve, reject };
  }

  function queueResponse(tickets: typeof mockQueueTickets, totalPages = 1) {
    return Response.json({ tickets, total: tickets.length, totalPages });
  }

  async function startFilterReset() {
    const previous = deferredResponse();
    const current = deferredResponse();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = new URL(String(input), "http://localhost");
        if (url.pathname.startsWith("/api/reference/")) {
          return Promise.resolve(
            Response.json({ categories: mockCategories, systems: [] })
          );
        }
        if (url.searchParams.get("page") === "2") {
          return Promise.resolve(queueResponse([mockQueueTickets[0]], 2));
        }
        return url.searchParams.has("search")
          ? previous.promise
          : current.promise;
      });
    await renderQueue(vi.fn(), "/staff/queue?search=certificate&page=2");
    await waitFor(() =>
      expect(screen.getByTestId("pagination-page-info")).toHaveTextContent(
        "Page 2 of 2"
      )
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => {
      const queries = fetchSpy.mock.calls
        .map(([input]) => new URL(String(input), "http://localhost"))
        .filter((url) => url.pathname === "/api/staff/tickets");
      expect(
        queries.some(
          (url) =>
            url.searchParams.get("search") === "certificate" &&
            url.searchParams.get("page") === "1"
        )
      ).toBe(true);
      expect(queries.some((url) => !url.searchParams.has("search"))).toBe(true);
    });
    return { previous, current };
  }

  it.each(["success", "forbidden", "network failure"] as const)(
    "ignores a late %s from the cleared search",
    async (outcome) => {
      const { previous, current } = await startFilterReset();
      await act(async () =>
        current.resolve(queueResponse([mockQueueTickets[1]]))
      );
      await waitFor(() =>
        expect(
          screen.getAllByText(mockQueueTickets[1].summary).length
        ).toBeGreaterThan(0)
      );

      await act(async () => {
        if (outcome === "network failure")
          previous.reject(new Error("Old request failed"));
        else
          previous.resolve(
            outcome === "forbidden"
              ? Response.json({}, { status: 403 })
              : queueResponse([mockQueueTickets[0]])
          );
      });

      expect(
        screen.getByPlaceholderText(/Search number or summary/i)
      ).toHaveValue("");
      expect(
        screen.getAllByText(mockQueueTickets[1].summary).length
      ).toBeGreaterThan(0);
      expect(screen.queryByText(mockQueueTickets[0].summary)).toBeNull();
      expect(screen.getByTestId("queue-result-count")).toHaveTextContent(
        "1 ticket"
      );
      expect(screen.queryByTestId("queue-forbidden")).toBeNull();
      expect(screen.queryByTestId("queue-failure")).toBeNull();
    }
  );

  it("keeps the current loading state when an older request finishes", async () => {
    const { previous, current } = await startFilterReset();
    await act(async () =>
      previous.resolve(queueResponse([mockQueueTickets[0]]))
    );
    expect(screen.getByTestId("queue-loading")).toBeInTheDocument();
    await act(async () =>
      current.resolve(queueResponse([mockQueueTickets[1]]))
    );
    await waitFor(() =>
      expect(screen.queryByTestId("queue-loading")).toBeNull()
    );
    expect(
      screen.getAllByText(mockQueueTickets[1].summary).length
    ).toBeGreaterThan(0);
  });
});
