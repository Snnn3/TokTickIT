/// <reference types="node" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RequesterTicketDetail } from "../../components/RequesterTicketDetail";
import type { TicketDetail } from "../../types/ticket";

// S-01 style-assertion convention: jsdom has no layout and cannot evaluate
// media queries, so the touch-target regression test below asserts the
// stylesheet rule text (read from disk -- vitest mocks `?raw` CSS imports
// to an empty string) rather than measured pixels. Resolved from the
// client package root, which is the working directory for `npm test`.
const indexCss = readFileSync(join(process.cwd(), "src", "index.css"), "utf8");

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

  it("wraps a 2000-char unbroken comment and still escapes markup (BR-14)", async () => {
    const unbroken = "x".repeat(2000);
    const markup = "<img src=x onerror=alert(1)>";
    await renderDetail({
      ...BASE_TICKET,
      publicComments: [
        {
          id: 9,
          body: unbroken,
          author: { id: 1, name: "Anucha Wongchai", role: "REQUESTER" },
          createdAt: "2026-09-12T09:00:00.000Z",
        },
        {
          id: 10,
          body: markup,
          author: { id: 9, name: "Kittipong Saelim", role: "IT_STAFF" },
          createdAt: "2026-09-12T09:05:00.000Z",
        },
      ],
    });

    const items = screen.getAllByTestId("comment-item");
    expect(items).toHaveLength(2);

    // jsdom cannot measure overflow, so assert the wrapping rule itself,
    // following the S-01 whitespace style-assertion convention: pre-wrap is
    // kept and overflow-wrap breaks the unbroken run at 375px.
    const longBody = within(items[0]).getByText(unbroken);
    expect(longBody).toHaveStyle({
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
    });

    // Safe rendering intact: markup lands as text, never as an element.
    expect(within(items[1]).getByText(markup)).toBeInTheDocument();
    expect(items[1].querySelector("img")).toBeNull();
  });

  it("wraps a 2000-char unbroken resolution summary the same way (P2-1)", async () => {
    const unbroken = "y".repeat(2000);
    await renderDetail({
      ...BASE_TICKET,
      status: "RESOLVED",
      resolutionSummary: unbroken,
    });

    // Mirror of the comment-body case above, same S-01 whitespace
    // style-assertion convention: jsdom cannot measure overflow, so assert
    // the wrapping rule itself -- pre-wrap kept and overflow-wrap breaks
    // the unbroken run at 375px.
    const summaryBody = screen.getByTestId("resolution-summary-body");
    expect(summaryBody).toHaveTextContent(unbroken);
    expect(summaryBody).toHaveStyle({
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
    });
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

  it("pulls focus back inside when it escapes the appears-resolved dialog", async () => {
    mockApi(BASE_TICKET);
    render(
      <div>
        <button type="button" data-testid="outside-control">
          Outside
        </button>
        <RequesterTicketDetail ticketId={42} onBack={vi.fn()} />
      </div>
    );
    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("appears-resolved-btn"));
    const dialog = screen.getByTestId("appears-resolved-confirm");
    const confirmBtn = screen.getByTestId("appears-resolved-confirm-btn");
    await waitFor(() => {
      expect(document.activeElement).toBe(confirmBtn);
    });

    // A click-away or programmatic focus outside is contained back inside.
    const outside = screen.getByTestId("outside-control");
    outside.focus();
    fireEvent.focusIn(outside);
    await waitFor(() => {
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    });
    expect(screen.getByTestId("appears-resolved-confirm")).toBeInTheDocument();
  });

  it("pulls focus back inside when it escapes the reopen dialog", async () => {
    mockApi({ ...BASE_TICKET, status: "RESOLVED" });
    render(
      <div>
        <button type="button" data-testid="outside-control">
          Outside
        </button>
        <RequesterTicketDetail ticketId={42} onBack={vi.fn()} />
      </div>
    );
    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("reopen-btn"));
    const dialog = screen.getByTestId("reopen-confirm");
    const confirmBtn = screen.getByTestId("reopen-confirm-btn");
    await waitFor(() => {
      expect(document.activeElement).toBe(confirmBtn);
    });

    const outside = screen.getByTestId("outside-control");
    outside.focus();
    fireEvent.focusIn(outside);
    await waitFor(() => {
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    });
    expect(screen.getByTestId("reopen-confirm")).toBeInTheDocument();
  });

  it("keeps focus contained in the appears-resolved dialog while busy, and Escape still does not close (ui-spec §10, BR-18)", async () => {
    // The signal POST stays in flight so the dialog sits in its busy state.
    let resolveSignal!: (value: Response) => void;
    const signalFlight = new Promise<Response>((resolve) => {
      resolveSignal = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/appears-resolved") && init?.method === "POST") {
        return await signalFlight;
      }
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
          json: async () => ({ ticket: BASE_TICKET }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });
    render(
      <div>
        <button type="button" data-testid="outside-control">
          Outside
        </button>
        <RequesterTicketDetail ticketId={42} onBack={vi.fn()} />
      </div>
    );
    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("appears-resolved-btn"));
    const dialog = screen.getByTestId("appears-resolved-confirm");
    const confirmBtn = screen.getByTestId("appears-resolved-confirm-btn");
    await waitFor(() => {
      expect(document.activeElement).toBe(confirmBtn);
    });

    // Confirm: the request is now in flight (busy), proven by the disabled
    // confirm action, while the dialog stays open.
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(confirmBtn).toBeDisabled();
    });
    expect(screen.getByTestId("appears-resolved-confirm")).toBeInTheDocument();

    // Focus escaping mid-request is still pulled back inside the open dialog.
    const outside = screen.getByTestId("outside-control");
    outside.focus();
    fireEvent.focusIn(outside);
    await waitFor(() => {
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    });
    expect(screen.getByTestId("appears-resolved-confirm")).toBeInTheDocument();

    // Escape mid-request still does not close (BR-18 in-flight lockout).
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByTestId("appears-resolved-confirm")).toBeInTheDocument();

    // Settle the flight: success reports and the dialog closes.
    resolveSignal({
      ok: true,
      status: 200,
      json: async () => ({ appearsResolvedAt: "2026-09-12T08:00:00.000Z" }),
    } as Response);
    await waitFor(() => {
      expect(
        screen.getByTestId("appears-resolved-success")
      ).toBeInTheDocument();
    });
  });
});

describe("Requester detail mobile touch targets (ui-spec §10, AC-18)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("covers the attachment filename download control with the 44px mobile rule at 375px", async () => {
    await renderDetail({
      ...BASE_TICKET,
      attachments: [
        {
          id: 101,
          ticketId: 42,
          filename: "report.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2048,
          uploadedAt: "2026-08-30T10:00:00.000Z",
          removedAt: null,
          removedReason: null,
        },
      ],
    });

    // (a) The filename download control is a real <button> carrying the
    // covered class, rendered inside the scoped detail root.
    const detailView = screen.getByTestId("ticket-detail-view");
    const filenameButton = screen.getByTitle("Download report.pdf");
    expect(filenameButton.tagName).toBe("BUTTON");
    expect(filenameButton).toHaveClass("zg-action-link");
    expect(detailView).toContainElement(filenameButton);

    // (b) S-01 style-assertion convention: jsdom has no layout and cannot
    // evaluate media queries, so assert the stylesheet rule itself rather
    // than measured pixels -- the declaration block holding the covering
    // selector inside the below-768px query must set min-height: 44px.
    const queryStart = indexCss.indexOf("@media (max-width: 767.98px)");
    expect(queryStart).toBeGreaterThan(-1);
    const mobileQuery = indexCss.slice(queryStart);
    const selector = '[data-testid="ticket-detail-view"] .zg-action-link';
    const atSelector = mobileQuery.indexOf(selector);
    expect(atSelector).toBeGreaterThan(-1);
    const blockOpen = mobileQuery.indexOf("{", atSelector);
    const blockClose = mobileQuery.indexOf("}", blockOpen);
    expect(blockOpen).toBeGreaterThan(atSelector);
    expect(blockClose).toBeGreaterThan(blockOpen);
    expect(mobileQuery.slice(blockOpen, blockClose)).toMatch(
      /min-height:\s*44px/
    );
  });

  it("guarantees the 44px width half of 44x44 for the Close and filename buttons at 375px (P2-2)", async () => {
    await renderDetail({
      ...BASE_TICKET,
      attachments: [
        {
          id: 101,
          ticketId: 42,
          filename: "a.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2048,
          uploadedAt: "2026-08-30T10:00:00.000Z",
          removedAt: null,
          removedReason: null,
        },
      ],
    });

    // (a) Both cited controls are real <button> targets inside the scoped
    // detail root. The short filename ("a.pdf") is deliberate: a long name
    // is already wider than 44px, so only a short name proves the width
    // guarantee matters. The Close control lives in the removal dialog.
    const detailView = screen.getByTestId("ticket-detail-view");
    const filenameButton = screen.getByTitle("Download a.pdf");
    expect(filenameButton.tagName).toBe("BUTTON");
    expect(filenameButton).toHaveClass("zg-action-link");
    expect(detailView).toContainElement(filenameButton);

    fireEvent.click(screen.getByTestId("remove-button-101"));
    const closeButton = document.querySelector(
      '[data-testid="ticket-detail-view"] .btn-close'
    );
    expect(closeButton).not.toBeNull();
    expect(closeButton?.tagName).toBe("BUTTON");
    expect(detailView).toContainElement(closeButton as HTMLElement);

    // (b) S-01 style-assertion convention: jsdom has no layout and cannot
    // evaluate media queries, so assert the stylesheet rule itself rather
    // than measured pixels -- a declaration block inside the below-768px
    // query covering the button-like selectors must set min-width: 44px.
    // .form-control is excluded on purpose (full-width already; min-width
    // there could block flex shrinking), so the width rule covers .btn,
    // .btn-close and .zg-action-link only. A selector may appear in more
    // than one rule (min-height + min-width), so collect every min-width
    // block first instead of stopping at the first occurrence.
    const queryStart = indexCss.indexOf("@media (max-width: 767.98px)");
    expect(queryStart).toBeGreaterThan(-1);
    const mobileQuery = indexCss.slice(queryStart);
    const widthBlocks = [...mobileQuery.matchAll(/([^{}]+)\{[^}]*min-width:\s*44px[^}]*\}/g)].map(
      (m) => m[1]
    );
    expect(widthBlocks.length).toBeGreaterThan(0);
    for (const selector of [
      '[data-testid="ticket-detail-view"] .btn-close',
      '[data-testid="ticket-detail-view"] .zg-action-link',
      '[data-testid="ticket-detail-view"] .btn',
    ]) {
      expect(
        widthBlocks.some((list) => list.includes(selector)),
        `expected a mobile min-width: 44px rule to cover ${selector}`
      ).toBe(true);
    }
  });
});
