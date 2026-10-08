import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffActionsList } from "../../components/StaffActionsList";

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

function renderList(
  initialEntry = "/staff/actions?performedBy=me&page=2&pageSize=5"
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <StaffActionsList />
      <RouteLocation />
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
