import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffActionsList } from "../../components/StaffActionsList";
import { AuthHarnessProvider, testUser } from "../../test/authHarness";

const action = {
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
};

function RouteLocation() {
  const location = useLocation();
  return <output data-testid="current-search">{location.search}</output>;
}

function HistoryBackButton() {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(-1)} type="button">
      Browser back
    </button>
  );
}

function renderList(
  initialEntry = "/staff/actions?performedBy=me&page=2&pageSize=5",
  options: { withHistoryNavigation?: boolean; expireSession?: () => void } = {}
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthHarnessProvider
        harness={{
          user: testUser({ role: "IT_STAFF" }),
          expireSession: options.expireSession,
        }}
      >
        <StaffActionsList />
        <RouteLocation />
        {options.withHistoryNavigation && <HistoryBackButton />}
      </AuthHarnessProvider>
    </MemoryRouter>
  );
}

describe("StaffActionsList (C4-03, AC-12, AC-18)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("scopes the request to the current performer and links to the parent action", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        actions: [action],
        page: 2,
        pageSize: 5,
        total: 6,
        totalPages: 2,
      }),
    } as Response);
    renderList(
      "/staff/actions?performedBy=me&from=2026-10-01T00%3A00%3A00.000Z&to=2026-10-08T00%3A00%3A00.000Z&page=2&pageSize=5"
    );

    expect(await screen.findByText("Inspect network logs")).toHaveAttribute(
      "href",
      "/staff/tickets/31#action-401"
    );
    const requestUrl = String(fetchSpy.mock.calls[0][0]);
    expect(requestUrl).toContain("performedBy=me");
    expect(requestUrl).toContain("page=2");
    expect(requestUrl).toContain("pageSize=5");
    expect(requestUrl).toContain("from=2026-10-01T00%3A00%3A00.000Z");
    expect(screen.getByTestId("action-pagination")).toHaveTextContent(
      "Page 2 of 2 (6 actions)"
    );
  });

  it("changes page size while preserving dashboard date bounds", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        actions: [action],
        page: 1,
        pageSize: 5,
        total: 6,
        totalPages: 2,
      }),
    } as Response);
    renderList(
      "/staff/actions?performedBy=me&from=2026-10-01T00%3A00%3A00.000Z&to=2026-10-08T00%3A00%3A00.000Z"
    );

    await screen.findByText("Inspect network logs");
    fireEvent.change(screen.getByLabelText("Per page:"), {
      target: { value: "20" },
    });
    await waitFor(() => {
      expect(screen.getByTestId("current-search")).toHaveTextContent(
        /from=.*to=.*page=1&pageSize=20/
      );
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
    const refreshedUrl = String(fetchSpy.mock.calls[1][0]);
    expect(refreshedUrl).toContain("performedBy=me");
    expect(refreshedUrl).toContain("from=2026-10-01T00%3A00%3A00.000Z");
    expect(refreshedUrl).toContain("pageSize=20");
  });

  it("distinguishes empty and forbidden results", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        actions: [],
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      }),
    } as Response);
    const view = renderList();
    expect(await screen.findByTestId("actions-empty")).toBeInTheDocument();

    view.unmount();
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
    } as Response);
    renderList();
    expect(await screen.findByTestId("forbidden-panel")).toBeInTheDocument();
  });
});

function deferredResponse() {
  let resolve!: (response: Response) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Response>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function actionPage(title: string, pageSize: number) {
  return Response.json({
    actions: [{ ...action, title }],
    page: 1,
    pageSize,
    total: 6,
    totalPages: Math.ceil(6 / pageSize),
  });
}

describe("StaffActionsList request ordering", () => {
  beforeEach(() => vi.restoreAllMocks());

  it.each([
    "success",
    "forbidden",
    "server error",
    "network error",
    "expired session",
  ] as const)(
    "ignores a stale %s after browser Back restores page size 10",
    async (outcome) => {
      const stale = deferredResponse();
      const current = deferredResponse();
      const expireSession = vi.fn();
      let tenPageRequests = 0;
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation((input) => {
          const url = new URL(String(input), "http://localhost");
          if (url.searchParams.get("pageSize") === "5") return stale.promise;
          tenPageRequests += 1;
          if (tenPageRequests === 1)
            return Promise.resolve(
              actionPage("Initial ten-page-size result", 10)
            );
          return current.promise;
        });

      renderList("/staff/actions?performedBy=me&page=1&pageSize=10", {
        withHistoryNavigation: true,
        expireSession,
      });
      expect(
        await screen.findByText("Initial ten-page-size result")
      ).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Per page:"), {
        target: { value: "5" },
      });
      await waitFor(() =>
        expect(screen.getByTestId("current-search")).toHaveTextContent(
          "pageSize=5"
        )
      );
      await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
      fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
      await waitFor(() =>
        expect(screen.getByTestId("current-search")).toHaveTextContent(
          "pageSize=10"
        )
      );
      await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
      expect(screen.getByTestId("actions-loading")).toBeInTheDocument();

      await act(async () => {
        if (outcome === "network error") stale.reject(new Error("offline"));
        else if (outcome === "expired session")
          stale.resolve(
            Response.json(
              { error: { code: "AUTH_REQUIRED", message: "Expired" } },
              { status: 401 }
            )
          );
        else if (outcome === "forbidden")
          stale.resolve(Response.json({}, { status: 403 }));
        else if (outcome === "server error")
          stale.resolve(Response.json({}, { status: 500 }));
        else stale.resolve(actionPage("Stale five-page-size result", 5));
      });

      expect(screen.getByTestId("actions-loading")).toBeInTheDocument();
      expect(screen.queryByTestId("forbidden-panel")).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(expireSession).not.toHaveBeenCalled();

      await act(async () =>
        current.resolve(actionPage("Returned ten-page-size result", 10))
      );
      expect(
        await screen.findByText("Returned ten-page-size result")
      ).toBeInTheDocument();
      expect(screen.queryByText("Stale five-page-size result")).toBeNull();
      expect(screen.getByLabelText("Per page:")).toHaveValue("10");
      expect(screen.getByTestId("action-pagination")).toHaveTextContent(
        "Page 1 of 1 (6 actions)"
      );
    }
  );
});
