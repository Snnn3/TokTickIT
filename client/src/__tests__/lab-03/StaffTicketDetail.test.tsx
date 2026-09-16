import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { StaffTicketDetail } from "../../components/StaffTicketDetail";
import { AuthHarnessProvider, testUser } from "../../test/authHarness";

/**
 * C-04, C-05 and the staff-detail half of S-02 (AC-09..AC-12, AC-23, AC-24).
 *
 * Same seam as the queue suite: the component rendered directly with `fetch`
 * mocked. The harness supplies the staff identity the Claim shortcut assigns.
 */

const BASE_STAFF_TICKET = {
  id: 20,
  number: "TKT-2026-00020",
  ticketDate: "2026-09-01T10:00:00.000Z",
  status: "OPEN",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  summary: "VPN disconnects after ten minutes",
  description: "The VPN connects, then drops after about ten minutes.",
  categoryId: 1,
  systemId: 3,
  requester: { id: 2, name: "Busaba Srisawat" },
  owner: null,
  appearsResolvedAt: null,
  resolutionSummary: null,
  publicComments: [
    {
      id: 1,
      body: "The warning appears every morning.",
      author: { id: 2, name: "Busaba Srisawat", role: "REQUESTER" },
      createdAt: "2026-09-11T09:00:00.000Z",
    },
  ],
  internalNotes: [
    {
      id: 2,
      body: "Checking the concentrator logs.",
      author: { id: 9, name: "Kittipong Saelim", role: "IT_STAFF" },
      createdAt: "2026-09-11T10:00:00.000Z",
    },
  ],
  attachments: [],
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-02T10:00:00.000Z",
};

const ASSIGNEES = [
  { id: 9, name: "Kittipong Saelim", role: "IT_STAFF" },
  { id: 20, name: "Apinya Ratchada", role: "ADMINISTRATOR" },
];

type MockOptions = {
  ticket?: unknown;
  selfService?: boolean;
  status?: number;
  assignees?: unknown[];
};

function mockStaffDetailApi(options: MockOptions = {}) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const ticket = (options.ticket ?? BASE_STAFF_TICKET) as Record<
    string,
    unknown
  >;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes("/api/reference/categories")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ categories: [{ id: 1, name: "Network" }] }),
      } as Response;
    }
    if (url.includes("/api/reference/systems")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ systems: [{ id: 3, name: "VPN" }] }),
      } as Response;
    }
    if (url.includes("/api/staff/assignees")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ assignees: options.assignees ?? ASSIGNEES }),
      } as Response;
    }
    if (
      url.match(/\/api\/staff\/tickets\/\d+\/owner/) &&
      init?.method === "PATCH"
    ) {
      const body = JSON.parse(String(init.body));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          owner:
            body.ownerId === null
              ? null
              : (ASSIGNEES.find((a) => a.id === body.ownerId) ?? {
                  id: body.ownerId,
                  name: "Kittipong Saelim",
                }),
          status: ticket.status,
        }),
      } as Response;
    }
    if (
      url.match(/\/api\/staff\/tickets\/\d+\/priority/) &&
      init?.method === "PATCH"
    ) {
      const body = JSON.parse(String(init.body));
      return {
        ok: true,
        status: 200,
        json: async () => ({ itPriority: body.itPriority }),
      } as Response;
    }
    if (
      url.match(/\/api\/staff\/tickets\/\d+\/status/) &&
      init?.method === "PATCH"
    ) {
      const body = JSON.parse(String(init.body));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: body.status,
          resolutionSummary: body.resolutionSummary ?? null,
        }),
      } as Response;
    }
    if (url.endsWith("/comments") && init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      return {
        ok: true,
        status: 201,
        json: async () => ({
          id: 99,
          body: body.body.trim(),
          author: { id: 9, name: "Kittipong Saelim", role: "IT_STAFF" },
          createdAt: "2026-09-12T09:00:00.000Z",
        }),
      } as Response;
    }
    if (url.endsWith("/notes") && init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      return {
        ok: true,
        status: 201,
        json: async () => ({
          id: 100,
          body: body.body.trim(),
          author: { id: 9, name: "Kittipong Saelim", role: "IT_STAFF" },
          createdAt: "2026-09-12T09:05:00.000Z",
        }),
      } as Response;
    }
    if (
      url.match(/\/api\/staff\/tickets\/\d+$/) &&
      (!init?.method || init.method === "GET")
    ) {
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
                  : status === 404
                    ? "Ticket not found"
                    : "Failed to retrieve the ticket",
            },
          }),
        } as Response;
      }
      if (options.selfService) {
        const { internalNotes: _omitted, ...rest } = ticket;
        return {
          ok: true,
          status: 200,
          json: async () => ({ ticket: rest, selfService: true }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ ticket }),
      } as Response;
    }
    return { ok: true, status: 200, json: async () => ({}) } as Response;
  });
  return calls;
}

function renderStaffDetail() {
  return render(
    <AuthHarnessProvider
      harness={{
        user: testUser({ id: 9, role: "IT_STAFF", name: "Kittipong Saelim" }),
      }}
    >
      <StaffTicketDetail ticketId={20} onBack={vi.fn()} />
    </AuthHarnessProvider>
  );
}

async function renderLoaded(options: MockOptions = {}) {
  const calls = mockStaffDetailApi(options);
  renderStaffDetail();
  await waitFor(() => {
    expect(screen.getByTestId("staff-detail-view")).toBeInTheDocument();
  });
  return calls;
}

describe("StaffTicketDetail operations (C-04, AC-09..AC-11, AC-23)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders grouped info with the operational card and no service-actions surface", async () => {
    await renderLoaded();

    expect(screen.getByTestId("staff-detail-number")).toHaveTextContent(
      "TKT-2026-00020"
    );
    expect(screen.getByTestId("operational-card")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /ticket owner/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /it priority/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /new status/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId("resolution-summary-input")).toBeInTheDocument();
    // Out of scope this sprint: no service-actions surface anywhere.
    expect(screen.queryByText(/service actions?/i)).toBeNull();
    expect(screen.queryByText(/actions taken/i)).toBeNull();
  });

  it("lists active staff and admins plus Unassigned in the owner select, with a Claim shortcut", async () => {
    const calls = await renderLoaded();

    const ownerSelect = screen.getByRole("combobox", {
      name: /ticket owner/i,
    }) as HTMLSelectElement;
    const options = Array.from(ownerSelect.options).map((o) => o.textContent);
    expect(options).toEqual(
      expect.arrayContaining([
        "Unassigned",
        "Kittipong Saelim",
        "Apinya Ratchada",
      ])
    );

    fireEvent.click(screen.getByTestId("claim-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("owner-success")).toBeInTheDocument();
    });
    const ownerCall = calls.find((c) => c.url.includes("/owner"));
    expect(ownerCall?.init?.method).toBe("PATCH");
    expect(String(ownerCall?.init?.body)).toContain('"ownerId":9');
  });

  it("issues an IT priority PATCH and keeps the requested priority read-only", async () => {
    const calls = await renderLoaded();

    // Requested priority is displayed as a badge, never as an editable control.
    expect(screen.getByTestId("requested-priority-badge")).toHaveTextContent(
      "MEDIUM"
    );
    expect(
      screen.queryByRole("combobox", { name: /requested priority/i })
    ).toBeNull();

    fireEvent.change(screen.getByRole("combobox", { name: /it priority/i }), {
      target: { value: "HIGH" },
    });
    await waitFor(() => {
      expect(screen.getByTestId("priority-success")).toBeInTheDocument();
    });
    const priorityCall = calls.find((c) => c.url.includes("/priority"));
    expect(priorityCall?.init?.method).toBe("PATCH");
    expect(String(priorityCall?.init?.body)).toContain('"itPriority":"HIGH"');
    expect(String(priorityCall?.init?.body)).not.toContain("requestedPriority");
  });

  it("restricts the status select to the legal targets for the current status", async () => {
    await renderLoaded();

    const statusSelect = screen.getByRole("combobox", {
      name: /new status/i,
    }) as HTMLSelectElement;
    const values = Array.from(statusSelect.options).map((o) => o.value);
    // OPEN may go to In Progress, Waiting for Requester or Cancelled only.
    expect(values).toEqual(
      expect.arrayContaining([
        "IN_PROGRESS",
        "WAITING_FOR_REQUESTER",
        "CANCELLED",
      ])
    );
    expect(values).not.toContain("RESOLVED");
    expect(values).not.toContain("CLOSED");
    expect(values).not.toContain("OPEN");
  });

  it("requires a resolution summary before resolving", async () => {
    const calls = mockStaffDetailApi({
      ticket: { ...BASE_STAFF_TICKET, status: "IN_PROGRESS" },
    });
    renderStaffDetail();
    await waitFor(() => {
      expect(screen.getByTestId("staff-detail-view")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("combobox", { name: /new status/i }), {
      target: { value: "RESOLVED" },
    });
    // The summary field is focused and required once Resolved is chosen.
    await waitFor(() => {
      expect(screen.getByTestId("resolution-summary-input")).toHaveFocus();
    });

    fireEvent.click(screen.getByTestId("status-save-btn"));
    expect(
      await screen.findByTestId("status-validation-error")
    ).toHaveTextContent(/resolution summary/i);
    expect(calls.some((c) => c.url.includes("/status"))).toBe(false);

    fireEvent.change(screen.getByTestId("resolution-summary-input"), {
      target: { value: "Replaced the VPN profile." },
    });
    fireEvent.click(screen.getByTestId("status-save-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("status-success")).toBeInTheDocument();
    });
    const statusCall = calls.find((c) => c.url.includes("/status"));
    expect(String(statusCall?.init?.body)).toContain(
      "Replaced the VPN profile."
    );
  });

  it("confirms before closing or cancelling on the client and sends no confirm flag", async () => {
    const calls = mockStaffDetailApi({
      ticket: { ...BASE_STAFF_TICKET, status: "RESOLVED" },
    });
    renderStaffDetail();
    await waitFor(() => {
      expect(screen.getByTestId("staff-detail-view")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("combobox", { name: /new status/i }), {
      target: { value: "CLOSED" },
    });
    expect(screen.getByTestId("status-confirm")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("status-confirm-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("status-success")).toBeInTheDocument();
    });
    const statusCall = calls.find((c) => c.url.includes("/status"));
    expect(statusCall?.init?.method).toBe("PATCH");
    expect(String(statusCall?.init?.body)).not.toContain("confirm");
  });

  it("surfaces a rejected transition's server message rather than a generic error", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/api/reference/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ categories: [], systems: [] }),
        } as Response;
      }
      if (url.includes("/api/staff/assignees")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ assignees: ASSIGNEES }),
        } as Response;
      }
      if (
        url.match(/\/api\/staff\/tickets\/\d+$/) &&
        (!init?.method || (init as RequestInit).method === "GET")
      ) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ticket: BASE_STAFF_TICKET }),
        } as Response;
      }
      if (url.includes("/status")) {
        return {
          ok: false,
          status: 422,
          json: async () => ({
            error: {
              code: "INVALID_TRANSITION",
              message: "Cannot transition from OPEN to RESOLVED",
            },
          }),
        } as Response;
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    });
    renderStaffDetail();
    await waitFor(() => {
      expect(screen.getByTestId("staff-detail-view")).toBeInTheDocument();
    });

    // Drive the PATCH directly through the In Progress path: choose a legal
    // target, then the stubbed 422 carries the server reason to the panel.
    fireEvent.change(screen.getByRole("combobox", { name: /new status/i }), {
      target: { value: "IN_PROGRESS" },
    });
    fireEvent.click(screen.getByTestId("status-save-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("status-error")).toHaveTextContent(
        "Cannot transition from OPEN to RESOLVED"
      );
    });
  });
});

describe("StaffTicketDetail comments versus notes (C-05, AC-05, AC-12, AC-24)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders public comments and internal notes as visually unmistakable surfaces", async () => {
    await renderLoaded();

    const comments = screen.getByTestId("comments-section");
    const notes = screen.getByTestId("internal-notes");
    expect(comments).toBeInTheDocument();
    expect(notes).toBeInTheDocument();
    // White cards versus amber-tinted cards with a lock and an INTERNAL marker.
    expect(comments.className).not.toContain("zg-note-card");
    expect(notes.className).toContain("zg-note-card");
    expect(notes).toHaveTextContent("INTERNAL");
    expect(notes).toHaveTextContent(/never shown to the requester/i);
    expect(screen.getByTestId("note-list")).toHaveTextContent(
      "Checking the concentrator logs."
    );
    expect(screen.getByTestId("comment-list")).toHaveTextContent(
      "The warning appears every morning."
    );
  });

  it("posts comments and notes through their own endpoints with author and time from the backend", async () => {
    const calls = await renderLoaded();

    fireEvent.change(screen.getByTestId("comment-composer"), {
      target: { value: "Still broken after the reboot." },
    });
    fireEvent.click(screen.getByTestId("comment-post-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("comment-list")).toHaveTextContent(
        "Still broken after the reboot."
      );
    });

    fireEvent.change(screen.getByTestId("note-composer"), {
      target: { value: "Escalated to network ops." },
    });
    fireEvent.click(screen.getByTestId("note-post-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("note-list")).toHaveTextContent(
        "Escalated to network ops."
      );
    });

    const commentCall = calls.find((c) => c.url.endsWith("/comments"));
    expect(commentCall?.init?.method).toBe("POST");
    const noteCall = calls.find((c) => c.url.endsWith("/notes"));
    expect(noteCall?.init?.method).toBe("POST");
    // Author and time travel back from the backend response, rendered at once.
    expect(screen.getByTestId("note-list")).toHaveTextContent(
      "Kittipong Saelim"
    );
  });

  it("is append-only: neither comments nor notes offer edit or delete", async () => {
    await renderLoaded();

    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    expect(screen.queryByTestId("comment-edit-btn")).toBeNull();
    expect(screen.queryByTestId("note-delete-btn")).toBeNull();
  });

  it("replaces the operational card with an explanation and hides notes on a self-filed ticket", async () => {
    const calls = mockStaffDetailApi({ selfService: true });
    renderStaffDetail();
    await waitFor(() => {
      expect(screen.getByTestId("staff-detail-view")).toBeInTheDocument();
    });

    expect(screen.getByTestId("self-service-panel")).toHaveTextContent(
      /you filed this ticket/i
    );
    expect(screen.queryByTestId("operational-card")).toBeNull();
    expect(screen.queryByTestId("internal-notes")).toBeNull();
    expect(
      screen.queryByRole("combobox", { name: /ticket owner/i })
    ).toBeNull();
    expect(screen.queryByRole("combobox", { name: /it priority/i })).toBeNull();
    // Public discussion still works on the same ticket.
    expect(screen.getByTestId("comments-section")).toBeInTheDocument();
    expect(calls.some((c) => c.url.toLowerCase().includes("/notes"))).toBe(
      false
    );
  });
});

describe("StaffTicketDetail states (S-02, AC-18)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading while the detail is in flight", async () => {
    let resolveDetail!: (value: unknown) => void;
    const gate = new Promise((resolve) => {
      resolveDetail = resolve;
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
    renderStaffDetail();

    expect(screen.getByTestId("staff-detail-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("staff-detail-view")).toBeNull();

    resolveDetail({
      ok: true,
      status: 200,
      json: async () => ({ ticket: BASE_STAFF_TICKET }),
    });
    await waitFor(() => {
      expect(
        screen.queryByTestId("staff-detail-loading")
      ).not.toBeInTheDocument();
    });
  });

  it("renders forbidden, not-found and failure as distinguishable states", async () => {
    mockStaffDetailApi({ status: 403 });
    const first = render(
      <AuthHarnessProvider
        harness={{ user: testUser({ id: 9, role: "IT_STAFF" }) }}
      >
        <StaffTicketDetail ticketId={20} onBack={vi.fn()} />
      </AuthHarnessProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId("staff-detail-forbidden")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("staff-detail-failure")).toBeNull();
    first.unmount();

    vi.restoreAllMocks();
    mockStaffDetailApi({ status: 404 });
    const second = render(
      <AuthHarnessProvider
        harness={{ user: testUser({ id: 9, role: "IT_STAFF" }) }}
      >
        <StaffTicketDetail ticketId={20} onBack={vi.fn()} />
      </AuthHarnessProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId("staff-detail-error")).toBeInTheDocument();
    });
    second.unmount();

    vi.restoreAllMocks();
    mockStaffDetailApi({ status: 500 });
    render(
      <AuthHarnessProvider
        harness={{ user: testUser({ id: 9, role: "IT_STAFF" }) }}
      >
        <StaffTicketDetail ticketId={20} onBack={vi.fn()} />
      </AuthHarnessProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId("staff-detail-failure")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("distinguishes empty comments and notes from a loaded discussion", async () => {
    await renderLoaded({
      ticket: { ...BASE_STAFF_TICKET, publicComments: [], internalNotes: [] },
    });

    expect(screen.getByTestId("comments-empty")).toHaveTextContent(
      "No comments yet"
    );
    expect(screen.getByTestId("notes-empty")).toHaveTextContent(
      "No internal notes yet"
    );
  });
});
