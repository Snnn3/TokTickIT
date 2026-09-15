import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { RequesterTicketDetail } from "../../components/RequesterTicketDetail";
import type { TicketDetail } from "../../types/ticket";

/**
 * C-07 from tests.md (AC-22, FR-21).
 *
 * The requester detail additions over Lab 2: Public Comments list + create,
 * the appears-resolved action, reopen on own Resolved only, a read-only
 * Resolution Summary when present -- and the Internal Notes section never
 * rendered, whatever the ticket carries (AC-05, BR-04 read path).
 *
 * Same seam as the Lab 2 detail suite: the component rendered directly with
 * `fetch` mocked. It reads no auth context (identity travels in the session
 * cookie), so the auth harness has nothing to supply here.
 */

const BASE_TICKET: TicketDetail = {
  id: 42,
  number: "TKT-2026-00042",
  summary: "VPN disconnecting randomly",
  description: "Every 10 minutes the VPN connection drops.",
  categoryId: 4,
  systemId: 2,
  requestedPriority: "HIGH",
  status: "OPEN",
  requester: { id: 1, name: "Anucha Wongchai" },
  ticketDate: "2026-08-30T09:00:00.000Z",
  createdAt: "2026-08-30T09:00:00.000Z",
  updatedAt: "2026-08-30T10:30:00.000Z",
  appearsResolvedAt: null,
  resolutionSummary: null,
  publicComments: [],
  attachments: [],
};

function mockApi(ticket: TicketDetail) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
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
    if (url.endsWith("/comments") && init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      return {
        ok: true,
        status: 201,
        json: async () => ({
          id: 7,
          body: body.body.trim(),
          author: { id: 1, name: "Anucha Wongchai", role: "REQUESTER" },
          createdAt: "2026-09-12T09:00:00.000Z",
        }),
      } as Response;
    }
    if (url.endsWith("/appears-resolved") && init?.method === "POST") {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          appearsResolvedAt: "2026-09-12T08:00:00.000Z",
        }),
      } as Response;
    }
    if (url.endsWith("/reopen") && init?.method === "POST") {
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "REOPENED" }),
      } as Response;
    }
    if (url.includes("/api/tickets/42")) {
      return {
        ok: true,
        json: async () => ({ ticket }),
      } as Response;
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  });
  return calls;
}

async function renderDetail(ticket: TicketDetail = BASE_TICKET) {
  mockApi(ticket);
  const view = render(<RequesterTicketDetail ticketId={42} onBack={vi.fn()} />);
  await waitFor(() => {
    expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
  });
  return view;
}

describe("RequesterTicketDetail additions (C-07, AC-22, FR-21)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the reopen action only when the ticket is Resolved", async () => {
    const first = await renderDetail({ ...BASE_TICKET, status: "RESOLVED" });
    expect(screen.getByTestId("reopen-btn")).toBeInTheDocument();
    first.unmount();

    vi.restoreAllMocks();
    await renderDetail({ ...BASE_TICKET, status: "OPEN" });
    expect(screen.queryByTestId("reopen-btn")).not.toBeInTheDocument();
  });

  it("runs reopen through a confirmation and reports the REOPENED state", async () => {
    const calls = mockApi({
      ...BASE_TICKET,
      status: "RESOLVED",
      resolutionSummary: "Rebooted the server.",
    });
    render(<RequesterTicketDetail ticketId={42} onBack={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("reopen-btn"));
    expect(screen.getByTestId("reopen-confirm")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("reopen-confirm-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("reopen-success")).toBeInTheDocument();
    });

    const reopenCall = calls.find((c) => c.url.endsWith("/reopen"));
    expect(reopenCall?.init?.method).toBe("POST");
    // The ticket now reads REOPENED, so the action is gone with it.
    expect(screen.queryByTestId("reopen-btn")).not.toBeInTheDocument();
  });

  it("runs appears-resolved through a confirmation, then shows the banner and the badge", async () => {
    const calls = mockApi(BASE_TICKET);
    render(<RequesterTicketDetail ticketId={42} onBack={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId("appears-resolved-badge")
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("appears-resolved-btn"));
    expect(screen.getByTestId("appears-resolved-confirm")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("appears-resolved-confirm-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("appears-resolved-success")).toHaveTextContent(
        "Marked as appears resolved"
      );
    });

    const signalCall = calls.find((c) => c.url.endsWith("/appears-resolved"));
    expect(signalCall?.init?.method).toBe("POST");
    expect(screen.getByTestId("appears-resolved-badge")).toHaveTextContent(
      "REQUESTER SAYS FIXED"
    );
  });

  it("renders the Resolution Summary read-only when present and hides the panel when absent", async () => {
    const first = await renderDetail({
      ...BASE_TICKET,
      status: "RESOLVED",
      resolutionSummary: "Rebooted the server.",
    });

    const panel = screen.getByTestId("resolution-summary-panel");
    expect(panel).toHaveTextContent("Rebooted the server.");
    expect(panel.querySelector("textarea, input")).toBeNull();
    first.unmount();

    vi.restoreAllMocks();
    await renderDetail(BASE_TICKET);
    expect(
      screen.queryByTestId("resolution-summary-panel")
    ).not.toBeInTheDocument();
  });

  it("never renders an Internal Notes section", async () => {
    const calls = mockApi({
      ...BASE_TICKET,
      status: "RESOLVED",
      resolutionSummary: "Rebooted the server.",
    });
    render(<RequesterTicketDetail ticketId={42} onBack={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("internal-notes")).not.toBeInTheDocument();
    expect(screen.queryByText(/internal note/i)).not.toBeInTheDocument();
    expect(calls.some((c) => c.url.toLowerCase().includes("note"))).toBe(false);
  });

  it("lists public comments with an empty state, and posts through the comments endpoint", async () => {
    const calls = mockApi({
      ...BASE_TICKET,
      publicComments: [
        {
          id: 1,
          body: "First report.",
          author: { id: 1, name: "Anucha Wongchai", role: "REQUESTER" },
          createdAt: "2026-09-11T09:00:00.000Z",
        },
      ],
    });
    render(<RequesterTicketDetail ticketId={42} onBack={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
    });

    expect(screen.getByTestId("comment-list")).toHaveTextContent(
      "First report."
    );
    expect(screen.getByTestId("comment-list")).toHaveTextContent(
      "Anucha Wongchai"
    );

    const composer = screen.getByLabelText(/add a public comment/i);
    fireEvent.change(composer, { target: { value: "Still broken.  " } });
    expect(screen.getByTestId("comment-counter")).toHaveTextContent("15/2000");

    fireEvent.click(screen.getByTestId("comment-post-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("comment-list")).toHaveTextContent(
        "Still broken."
      );
    });

    const postCall = calls.find((c) => c.url.endsWith("/comments"));
    expect(postCall?.init?.method).toBe("POST");
    expect(String(postCall?.init?.body)).toContain("Still broken.");
  });

  it("shows the empty state with no comments and refuses an empty post without calling the API", async () => {
    const calls = mockApi(BASE_TICKET);
    render(<RequesterTicketDetail ticketId={42} onBack={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
    });

    expect(screen.getByTestId("comments-empty")).toHaveTextContent(
      "No comments yet"
    );

    fireEvent.change(screen.getByLabelText(/add a public comment/i), {
      target: { value: "    " },
    });
    fireEvent.click(screen.getByTestId("comment-post-btn"));

    expect(await screen.findByTestId("comment-error")).toBeInTheDocument();
    expect(calls.some((c) => c.url.endsWith("/comments"))).toBe(false);
  });
});

describe("Requester confirm dialogs keyboard (ui-spec §10)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("traps Tab inside the appears-resolved dialog and closes on Escape", async () => {
    mockApi(BASE_TICKET);
    render(<RequesterTicketDetail ticketId={42} onBack={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("appears-resolved-btn"));
    expect(screen.getByTestId("appears-resolved-confirm")).toBeInTheDocument();

    const confirmBtn = screen.getByTestId("appears-resolved-confirm-btn");
    const cancelBtn = screen.getByTestId("appears-resolved-cancel-btn");

    // Initial focus lands on the confirm action, same as the removal modal.
    await waitFor(() => {
      expect(document.activeElement).toBe(confirmBtn);
    });

    // Tab from the last control wraps to the first; Shift+Tab reverses it.
    cancelBtn.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(confirmBtn);

    confirmBtn.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(cancelBtn);

    // Escape closes the dialog without calling the API.
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(
        screen.queryByTestId("appears-resolved-confirm")
      ).not.toBeInTheDocument();
    });
  });

  it("traps Tab inside the reopen dialog and closes on Escape", async () => {
    mockApi({ ...BASE_TICKET, status: "RESOLVED" });
    render(<RequesterTicketDetail ticketId={42} onBack={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("reopen-btn"));
    expect(screen.getByTestId("reopen-confirm")).toBeInTheDocument();

    const confirmBtn = screen.getByTestId("reopen-confirm-btn");
    const cancelBtn = screen.getByTestId("reopen-cancel-btn");

    await waitFor(() => {
      expect(document.activeElement).toBe(confirmBtn);
    });

    cancelBtn.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(confirmBtn);

    confirmBtn.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(cancelBtn);

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("reopen-confirm")).not.toBeInTheDocument();
    });
  });
});
