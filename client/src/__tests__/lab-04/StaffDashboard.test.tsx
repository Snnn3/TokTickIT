import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffDashboard } from "../../components/StaffDashboard";
import { AuthHarnessProvider, testUser } from "../../test/authHarness";

const snapshot = {
  asOf: "2026-10-08T01:00:00.000Z",
  windowDays: 7 as const,
  metrics: {
    openTickets: 12,
    unassignedTickets: 3,
    myOwnedTickets: 4,
    myActiveActions: 2,
  },
  groupings: {
    ticketsByStatus: [
      { status: "NEW", count: 0 },
      { status: "OPEN", count: 1 },
      { status: "IN_PROGRESS", count: 11 },
      { status: "WAITING_FOR_REQUESTER", count: 0 },
      { status: "RESOLVED", count: 7 },
      { status: "CLOSED", count: 8 },
      { status: "REOPENED", count: 0 },
      { status: "CANCELLED", count: 0 },
    ],
  },
  lists: {
    recentTickets: [
      {
        id: 31,
        number: "TKT-2026-00031",
        summary: "Email client cannot connect",
        status: "IN_PROGRESS",
        requestedPriority: "MEDIUM",
        itPriority: "HIGH",
        owner: null,
        version: 4,
        createdAt: "2026-10-07T12:00:00.000Z",
        updatedAt: "2026-10-08T00:00:00.000Z",
        resolvedAt: null,
      },
    ],
    myRecentActions: [
      {
        id: 401,
        ticketId: 31,
        ticketNumber: "TKT-2026-00031",
        title: "Inspect network logs",
        status: "PLANNED",
        performedBy: {
          id: 9,
          name: "Kittipong Saelim",
          role: "IT_STAFF",
          isActive: true,
        },
        assignee: null,
        createdAt: "2026-10-08T00:00:00.000Z",
        updatedAt: "2026-10-08T00:00:00.000Z",
        version: 2,
      },
    ],
  },
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AuthHarnessProvider harness={{ user: testUser({ role: "IT_STAFF" }) }}>
        <StaffDashboard />
      </AuthHarnessProvider>
    </MemoryRouter>
  );
}

function okResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as Response;
}

describe("StaffDashboard (C4-03, AC-12, AC-13, AC-18)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows authoritative metrics, fixed-window links, recent rows and Bangkok time", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse(snapshot));
    renderDashboard();

    expect(screen.getByTestId("staff-dashboard-loading")).toBeInTheDocument();
    await screen.findByTestId("staff-dashboard-view");
    expect(screen.getByLabelText("Open Tickets: 12")).toHaveAttribute(
      "href",
      "/staff/queue?statusGroup=open"
    );
    expect(screen.getByLabelText("Unassigned Tickets: 3")).toHaveAttribute(
      "href",
      "/staff/queue?statusGroup=open&owner=unassigned"
    );
    expect(screen.getByLabelText("My Owned Tickets: 4")).toHaveAttribute(
      "href",
      "/staff/queue?statusGroup=open&owner=mine"
    );
    expect(screen.getByLabelText("My Active Actions: 2")).toHaveAttribute(
      "href",
      "/staff/actions?performedBy=me&statusGroup=active"
    );
    expect(screen.getByText(/08:00/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /TKT-2026-00031 · Email client/ })
    ).toHaveAttribute("href", "/staff/tickets/31");
    expect(
      screen.getByRole("link", { name: "Inspect network logs" })
    ).toHaveAttribute("href", "/staff/tickets/31#action-401");
    expect(
      screen.getAllByRole("link", { name: "View all" })[0]
    ).toHaveAttribute("href", expect.stringContaining("dateField=updatedAt"));
    expect(fetchSpy).toHaveBeenCalledWith("/api/dashboard/staff");
  });

  it("shows all server status groups, including zero and terminal counts, with matching queue links", async () => {
    renderDashboardWithResponse(snapshot);
    await screen.findByTestId("staff-dashboard-view");
    for (const group of snapshot.groupings.ticketsByStatus) {
      expect(
        screen.getByRole("link", {
          name: `${group.status.replaceAll("_", " ")} tickets: ${group.count}`,
        })
      ).toHaveAttribute("href", `/staff/queue?status=${group.status}`);
    }
  });

  it("keeps zero cards visible and gives each empty list its own useful message", async () => {
    renderDashboardWithResponse({
      ...snapshot,
      metrics: {
        openTickets: 0,
        unassignedTickets: 0,
        myOwnedTickets: 0,
        myActiveActions: 0,
      },
      lists: { recentTickets: [], myRecentActions: [] },
      groupings: {
        ticketsByStatus: snapshot.groupings.ticketsByStatus.map((group) => ({
          ...group,
          count: 0,
        })),
      },
    });

    await screen.findByTestId("staff-dashboard-view");
    expect(screen.getByLabelText("Open Tickets: 0")).toBeInTheDocument();
    expect(screen.getByTestId("recent-tickets-empty")).toBeInTheDocument();
    expect(screen.getByTestId("recent-actions-empty")).toBeInTheDocument();
  });

  it("labels a retained snapshot stale after refresh fails and offers retry", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(okResponse(snapshot))
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce(okResponse(snapshot));
    renderDashboard();
    await screen.findByTestId("staff-dashboard-view");

    fireEvent.click(screen.getByRole("button", { name: "Refresh dashboard" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "snapshot is stale"
    );
    expect(screen.getByLabelText("Open Tickets: 12")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  it("renders a forbidden state without dashboard data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
    } as Response);
    renderDashboard();

    expect(
      await screen.findByTestId("staff-dashboard-forbidden")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-metric-openTickets")).toBeNull();
  });

  it("does not present zero counts as a successful empty snapshot after initial failure", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce(okResponse(snapshot));
    renderDashboard();

    expect(
      await screen.findByTestId("staff-dashboard-failure")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-metric-openTickets")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(
      await screen.findByTestId("staff-dashboard-view")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Open Tickets: 12")).toBeInTheDocument();
  });
});

function renderDashboardWithResponse(data: unknown) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(okResponse(data));
  return renderDashboard();
}
