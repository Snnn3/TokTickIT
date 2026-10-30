import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffTicketDetail } from "../../components/StaffTicketDetail";
import { AuthHarnessProvider, userWithRole } from "../../test/authHarness";

const ticket = {
  id: 20,
  number: "TKT-2026-00020",
  ticketDate: "2026-09-01T10:00:00.000Z",
  status: "IN_PROGRESS",
  version: 7,
  resolvedAt: null,
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
  publicComments: [],
  internalNotes: [],
  attachments: [],
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-02T10:00:00.000Z",
};

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("TicketWorkflow (C4-04, AC-07, AC-08, AC-14)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("requires a resolution summary and keeps the server action-result gate visible", async () => {
    const user = userEvent.setup();
    const writes: Array<{ body: string; method: string | undefined }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/reference/categories") {
        return response({ categories: [{ id: 1, name: "Network" }] });
      }
      if (url === "/api/reference/systems") {
        return response({ systems: [{ id: 3, name: "VPN" }] });
      }
      if (url === "/api/staff/assignees") {
        return response({ assignees: [] });
      }
      if (url === "/api/staff/tickets/20") {
        return response({ ticket, selfService: false });
      }
      if (url === "/api/tickets/20/actions") {
        return response({ actions: [], ticketVersion: ticket.version });
      }
      if (url === "/api/staff/tickets/20/status" && init?.method === "PATCH") {
        writes.push({ body: String(init.body), method: init.method });
        return response(
          {
            error: {
              code: "ACTION_RESULT_REQUIRED",
              message:
                "A completed Action with a meaningful result is required to resolve this Ticket",
            },
          },
          400
        );
      }
      return response({ error: { message: "Unexpected test request" } }, 404);
    });

    render(
      <AuthHarnessProvider harness={{ user: userWithRole("IT_STAFF") }}>
        <StaffTicketDetail ticketId={ticket.id} onBack={vi.fn()} />
      </AuthHarnessProvider>
    );

    await screen.findByTestId("staff-detail-view");
    await user.selectOptions(screen.getByLabelText("New status"), "RESOLVED");
    const summary = screen.getByTestId("resolution-summary-input");
    expect(summary).toHaveAttribute("aria-required", "true");
    await waitFor(() => expect(summary).toHaveFocus());

    await user.click(screen.getByTestId("status-save-btn"));
    expect(screen.getByTestId("status-validation-error")).toHaveTextContent(
      "A resolution summary is required"
    );
    expect(writes).toHaveLength(0);

    await user.type(summary, "  Verified the network fix.  ");
    await user.click(screen.getByTestId("status-save-btn"));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({ method: "PATCH" });
    expect(JSON.parse(writes[0].body)).toEqual({
      status: "RESOLVED",
      resolutionSummary: "Verified the network fix.",
      expectedVersion: 7,
    });
    expect(await screen.findByTestId("status-error")).toHaveTextContent(
      "A completed Action with a meaningful result is required"
    );
    expect(screen.queryByTestId("status-success")).not.toBeInTheDocument();
  });
});
