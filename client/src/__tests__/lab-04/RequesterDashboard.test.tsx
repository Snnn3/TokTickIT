import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { StrictMode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequesterDashboard } from "../../components/RequesterDashboard";
import { AuthHarnessProvider, testUser } from "../../test/authHarness";

const snapshot = {
  asOf: "2026-10-08T01:00:00.000Z",
  windowDays: 7 as const,
  metrics: {
    openTickets: 5,
    waitingForRequester: 1,
    recentlyUpdated: 8,
    recentlyResolved: 2,
  },
  lists: {
    attentionTickets: [
      {
        id: 84,
        number: "TKT-2026-00084",
        summary: "Waiting for your confirmation",
        status: "WAITING_FOR_REQUESTER",
        requestedPriority: "MEDIUM",
        itPriority: "HIGH",
        owner: null,
        version: 3,
        createdAt: "2026-10-01T01:00:00.000Z",
        updatedAt: "2026-10-08T00:00:00.000Z",
        resolvedAt: null,
      },
    ],
    recentTickets: [
      {
        id: 85,
        number: "TKT-2026-00085",
        summary: "Email client updated",
        status: "IN_PROGRESS",
        requestedPriority: "LOW",
        itPriority: "MEDIUM",
        owner: null,
        version: 2,
        createdAt: "2026-10-02T01:00:00.000Z",
        updatedAt: "2026-10-07T20:00:00.000Z",
        resolvedAt: null,
      },
    ],
    resolvedTickets: [
      {
        id: 86,
        number: "TKT-2026-00086",
        summary: "VPN access restored",
        status: "RESOLVED",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        owner: null,
        version: 4,
        createdAt: "2026-10-01T01:00:00.000Z",
        updatedAt: "2026-10-06T20:00:00.000Z",
        resolvedAt: "2026-10-06T20:00:00.000Z",
      },
    ],
  },
};

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/requester"]}>
      <AuthHarnessProvider harness={{ user: testUser({ role: "REQUESTER" }) }}>
        <RequesterDashboard />
      </AuthHarnessProvider>
    </MemoryRouter>
  );
}

function renderDashboardInStrictMode() {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={["/dashboard/requester"]}>
        <AuthHarnessProvider
          harness={{ user: testUser({ role: "REQUESTER" }) }}
        >
          <RequesterDashboard />
        </AuthHarnessProvider>
      </MemoryRouter>
    </StrictMode>
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function okResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as Response;
}

describe("RequesterDashboard (C4-02, AC-11, AC-13, AC-18)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows backend counts, owned ticket lists and exact dashboard drill-downs", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(okResponse(snapshot));
    renderDashboard();

    expect(
      screen.getByTestId("requester-dashboard-loading")
    ).toBeInTheDocument();
    await screen.findByTestId("requester-dashboard-view");
    expect(screen.getByLabelText("My Open Tickets: 5")).toHaveAttribute(
      "href",
      "/tickets?statusGroup=open"
    );
    expect(screen.getByLabelText("Waiting for Me: 1")).toHaveAttribute(
      "href",
      "/tickets?status=WAITING_FOR_REQUESTER"
    );
    const updatedLink = screen.getByLabelText("Recently Updated: 8");
    expect(updatedLink).toHaveAttribute(
      "href",
      expect.stringContaining("dateField=updatedAt")
    );
    expect(updatedLink).toHaveAttribute(
      "href",
      expect.stringContaining("from=2026-10-01T01%3A00%3A00.000Z")
    );
    expect(updatedLink).toHaveAttribute(
      "href",
      expect.stringContaining("to=2026-10-08T01%3A00%3A00.000Z")
    );
    const resolvedLink = screen.getByLabelText("Recently Resolved: 2");
    expect(resolvedLink).toHaveAttribute(
      "href",
      expect.stringContaining("statusGroup=resolved")
    );
    expect(resolvedLink).toHaveAttribute(
      "href",
      expect.stringContaining("dateField=resolvedAt")
    );
    expect(
      screen.getByRole("link", {
        name: /TKT-2026-00085 · Email client updated/,
      })
    ).toHaveAttribute("href", "/tickets/85");
    expect(
      screen.getByRole("link", { name: /TKT-2026-00086 · VPN access restored/ })
    ).toHaveAttribute("href", "/tickets/86");
    expect(screen.getByTestId("requester-dashboard-view")).toHaveTextContent(
      "Recent: last 7 days"
    );
    expect(screen.getByTestId("requester-dashboard-view")).toHaveTextContent(
      "Bangkok"
    );
    expect(screen.getByTestId("requester-dashboard-view")).toHaveTextContent(
      "All tickets waiting for your response, newest first."
    );
    expect(
      screen.getByText(/Updated since .*newest first\./)
    ).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith("/api/dashboard/requester");
  });

  it("keeps four zero metric cards and distinct empty messages", async () => {
    renderDashboardWithResponse({
      ...snapshot,
      metrics: {
        openTickets: 0,
        waitingForRequester: 0,
        recentlyUpdated: 0,
        recentlyResolved: 0,
      },
      lists: { attentionTickets: [], recentTickets: [], resolvedTickets: [] },
    });

    await screen.findByTestId("requester-dashboard-view");
    expect(screen.getByLabelText("My Open Tickets: 0")).toBeInTheDocument();
    expect(screen.getByTestId("requester-attention-empty")).toBeInTheDocument();
    expect(screen.getByTestId("requester-recent-empty")).toBeInTheDocument();
    expect(screen.getByTestId("requester-resolved-empty")).toBeInTheDocument();
  });

  it.each([
    [403, "requester-dashboard-forbidden"],
    [404, "requester-dashboard-not-found"],
  ])("renders the distinct HTTP %s dashboard state", async (status, testId) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status,
    } as Response);
    renderDashboard();
    expect(await screen.findByTestId(testId)).toBeInTheDocument();
    expect(screen.queryByTestId("requester-dashboard-view")).toBeNull();
  });

  it("labels a retained snapshot stale on safe failure and supports retry", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(okResponse(snapshot))
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce(okResponse(snapshot));
    renderDashboard();
    await screen.findByTestId("requester-dashboard-view");

    fireEvent.click(screen.getByRole("button", { name: "Refresh dashboard" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "snapshot is stale"
    );
    expect(screen.getByLabelText("My Open Tickets: 5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  it("offers a safe retry after an initial request failure", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce(okResponse(snapshot));
    renderDashboard();

    expect(
      await screen.findByTestId("requester-dashboard-failure")
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/My Open Tickets/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(
      await screen.findByTestId("requester-dashboard-view")
    ).toBeInTheDocument();
  });

  it("ignores an obsolete StrictMode load while a newer refresh is pending", async () => {
    const obsoleteLoad = deferred<Response>();
    const currentInitialLoad = deferred<Response>();
    const refreshLoad = deferred<Response>();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValueOnce(obsoleteLoad.promise)
      .mockReturnValueOnce(currentInitialLoad.promise)
      .mockReturnValueOnce(refreshLoad.promise);

    renderDashboardInStrictMode();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));

    await act(async () => {
      currentInitialLoad.resolve(
        okResponse({
          ...snapshot,
          asOf: "2026-10-08T02:00:00.000Z",
          metrics: { ...snapshot.metrics, openTickets: 20 },
        })
      );
      await currentInitialLoad.promise;
    });
    expect(screen.getByLabelText("My Open Tickets: 20")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh dashboard" }));
    expect(screen.getByRole("button", { name: "Refreshing…" })).toBeDisabled();

    await act(async () => {
      obsoleteLoad.resolve(
        okResponse({
          ...snapshot,
          asOf: "2026-10-08T01:00:00.000Z",
          metrics: { ...snapshot.metrics, openTickets: 10 },
        })
      );
      await obsoleteLoad.promise;
    });
    expect(screen.getByLabelText("My Open Tickets: 20")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refreshing…" })).toBeDisabled();

    await act(async () => {
      refreshLoad.resolve(
        okResponse({
          ...snapshot,
          asOf: "2026-10-08T03:00:00.000Z",
          metrics: { ...snapshot.metrics, openTickets: 30 },
        })
      );
      await refreshLoad.promise;
    });
    expect(screen.getByLabelText("My Open Tickets: 30")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Refresh dashboard" })
    ).toBeEnabled();
  });
});

function renderDashboardWithResponse(data: unknown) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(okResponse(data));
  return renderDashboard();
}
