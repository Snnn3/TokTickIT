import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { ActionsTakenPanel } from "../../components/ActionsTakenPanel";

const BASE_ACTION = {
  id: 31,
  ticketId: 42,
  title: "Restart VPN gateway",
  details: "Restarted the gateway after collecting diagnostic logs.",
  result: "VPN connections are stable again.",
  performedBy: {
    id: 9,
    name: "Kittipong Saelim",
    role: "IT_STAFF",
    isActive: true,
  },
  assignee: {
    id: 11,
    name: "Former Staff Member",
    role: "IT_STAFF",
    isActive: false,
  },
  status: "COMPLETED",
  followUpRequired: true,
  followUpNote: "Check the connection again tomorrow.",
  attachmentNotes: "Diagnostic log is attached to the Ticket.",
  version: 2,
  createdAt: "2026-10-06T03:00:00.000Z",
  updatedAt: "2026-10-06T04:00:00.000Z",
  completedAt: "2026-10-06T04:00:00.000Z",
};

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

type RecordedRequest = { url: string; init?: RequestInit };
type ActionApiRoute = (init?: RequestInit) => Response | Promise<Response>;

function mockActionApi(
  routes: Record<string, ActionApiRoute>
): RecordedRequest[] {
  const calls: RecordedRequest[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    const route = routes[`${init?.method ?? "GET"} ${url}`];
    return route
      ? route(init)
      : response({ error: { code: "NOT_FOUND" } }, 404);
  });
  return calls;
}

describe("ActionsTakenPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a Ticket's action history read-only, including inactive historical assignees", async () => {
    const actions = [
      {
        ...BASE_ACTION,
        id: 30,
        title: "Check the VPN service",
        createdAt: "2026-10-05T03:00:00.000Z",
      },
      BASE_ACTION,
      {
        ...BASE_ACTION,
        id: 32,
        title: "Confirm requester access",
        createdAt: "2026-10-07T03:00:00.000Z",
      },
    ];
    const calls = mockActionApi({
      "GET /api/tickets/42/actions": () =>
        response({ actions, ticketVersion: 7 }),
    });

    render(
      <ActionsTakenPanel
        ticketId={42}
        ticketVersion={7}
        ticketStatus="OPEN"
        canManage={false}
      />
    );

    expect(await screen.findByText("Restart VPN gateway")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Actions Taken (3)" })
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByTestId("action-item")
        .map(
          (item) => within(item).getByRole("heading", { level: 3 }).textContent
        )
    ).toEqual([
      "Check the VPN service",
      "Restart VPN gateway",
      "Confirm requester access",
    ]);
    expect(
      within(screen.getAllByTestId("action-item")[1]).getByText(
        "VPN connections are stable again."
      )
    ).toBeInTheDocument();
    const middleAction = within(screen.getAllByTestId("action-item")[1]);
    expect(middleAction.getByText("Kittipong Saelim")).toBeInTheDocument();
    expect(middleAction.getByText("Former Staff Member")).toBeInTheDocument();
    expect(middleAction.getByText("Inactive")).toBeInTheDocument();
    expect(
      middleAction.getByText("Check the connection again tomorrow.")
    ).toBeInTheDocument();
    expect(
      middleAction.getByText("Diagnostic log is attached to the Ticket.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add action/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /edit action/i })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(calls.map(({ url }) => url)).toEqual(["/api/tickets/42/actions"]);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /actions taken/i })
      ).toBeInTheDocument();
    });
  });

  it("creates an action with conditional follow-up validation and server-owned performer data", async () => {
    const onTicketVersionChange = vi.fn();
    const calls = mockActionApi({
      "GET /api/tickets/42/actions": () =>
        response({ actions: [], ticketVersion: 7 }),
      "GET /api/staff/action-assignees": () =>
        response({
          assignees: [
            {
              id: 9,
              name: "Kittipong Saelim",
              role: "IT_STAFF",
              isActive: true,
            },
          ],
        }),
      "POST /api/staff/tickets/42/actions": (init) => {
        const body = JSON.parse(String(init?.body));
        return response(
          {
            action: {
              ...BASE_ACTION,
              id: 32,
              title: body.title,
              details: body.details,
              result: null,
              performedBy: {
                id: 9,
                name: "Kittipong Saelim",
                role: "IT_STAFF",
                isActive: true,
              },
              assignee: null,
              status: "PLANNED",
              followUpRequired: body.followUpRequired,
              followUpNote: body.followUpNote,
              attachmentNotes: body.attachmentNotes,
              version: 1,
              createdAt: "2026-10-07T05:00:00.000Z",
              updatedAt: "2026-10-07T05:00:00.000Z",
              completedAt: null,
            },
            ticketVersion: 8,
          },
          201
        );
      },
    });

    render(
      <ActionsTakenPanel
        ticketId={42}
        ticketVersion={7}
        ticketStatus="OPEN"
        canManage
        performerName="Kittipong Saelim"
        onTicketVersionChange={onTicketVersionChange}
      />
    );

    fireEvent.click(await screen.findByRole("button", { name: "Add Action" }));
    fireEvent.change(screen.getByLabelText("Action title"), {
      target: { value: "Reset edge router" },
    });
    fireEvent.change(screen.getByLabelText("Action description"), {
      target: { value: "Restarted the router and monitored the connection." },
    });
    fireEvent.click(screen.getByLabelText("Follow-up required"));
    expect(screen.getByLabelText("Follow-up note")).toBeInTheDocument();
    expect(screen.queryByLabelText("Performed by")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));
    expect(
      await screen.findByText(/follow-up note is required/i)
    ).toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(calls.filter((call) => call.init?.method === "POST")).toHaveLength(
      0
    );

    fireEvent.change(screen.getByLabelText("Follow-up note"), {
      target: { value: "Confirm the link stays stable tomorrow." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

    expect(await screen.findByText("Reset edge router")).toBeInTheDocument();
    const createCall = calls.find((call) => call.init?.method === "POST");
    const payload = JSON.parse(String(createCall?.init?.body));
    expect(payload).toMatchObject({
      title: "Reset edge router",
      details: "Restarted the router and monitored the connection.",
      followUpRequired: true,
      followUpNote: "Confirm the link stays stable tomorrow.",
      expectedTicketVersion: 7,
    });
    expect(payload).not.toHaveProperty("performedBy");
    expect(createCall?.init?.headers).toMatchObject({
      "Idempotency-Key": expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ),
    });
    expect(onTicketVersionChange).toHaveBeenLastCalledWith(
      8,
      "2026-10-07T05:00:00.000Z"
    );
  });

  it("limits edit status choices and requires a result before completing an action", async () => {
    const calls = mockActionApi({
      "GET /api/tickets/42/actions": () =>
        response({
          actions: [
            {
              ...BASE_ACTION,
              status: "IN_PROGRESS",
              result: null,
              completedAt: null,
            },
          ],
          ticketVersion: 7,
        }),
      "GET /api/staff/action-assignees": () =>
        response({
          assignees: [
            {
              id: 9,
              name: "Kittipong Saelim",
              role: "IT_STAFF",
              isActive: true,
            },
          ],
        }),
      "PATCH /api/staff/tickets/42/actions/31": (init) => {
        const body = JSON.parse(String(init?.body));
        return response({
          action: {
            ...BASE_ACTION,
            status: body.status,
            result: body.result,
            version: 3,
            completedAt: "2026-10-07T05:00:00.000Z",
          },
          ticketVersion: 8,
        });
      },
    });

    render(
      <ActionsTakenPanel
        ticketId={42}
        ticketVersion={7}
        ticketStatus="IN_PROGRESS"
        canManage
      />
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Edit Restart VPN gateway" })
    );
    const status = screen.getByLabelText("Action status") as HTMLSelectElement;
    expect(Array.from(status.options).map((option) => option.value)).toEqual([
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
    ]);
    fireEvent.change(status, { target: { value: "COMPLETED" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

    expect(
      await screen.findByText(/enter a result before completing/i)
    ).toBeInTheDocument();
    expect(calls.filter((call) => call.init?.method === "PATCH")).toHaveLength(
      0
    );

    fireEvent.change(screen.getByLabelText("Action result"), {
      target: { value: "VPN remained stable during a 20-minute test." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));
    await waitFor(() => {
      expect(screen.getByTestId("action-success")).toHaveTextContent(
        "Action completed."
      );
    });
    const editCall = calls.find((call) => call.init?.method === "PATCH");
    expect(JSON.parse(String(editCall?.init?.body))).toMatchObject({
      expectedVersion: 2,
      expectedTicketVersion: 7,
      status: "COMPLETED",
      result: "VPN remained stable during a 20-minute test.",
    });
    expect(JSON.parse(String(editCall?.init?.body))).not.toHaveProperty(
      "performedBy"
    );
    expect(
      screen.queryByRole("button", { name: "Edit Restart VPN gateway" })
    ).toBeNull();
  });

  it("refreshes a stale edit for comparison and waits for an explicit retry", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    let reads = 0;
    let writes = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === "/api/tickets/42/actions") {
        reads += 1;
        return response({
          actions: [
            {
              ...BASE_ACTION,
              status: "PLANNED",
              completedAt: null,
              title: reads === 1 ? "Original title" : "Latest saved title",
              version: reads === 1 ? 2 : 3,
            },
          ],
          ticketVersion: reads === 1 ? 7 : 8,
        });
      }
      if (url === "/api/staff/action-assignees") {
        return response({
          assignees: [
            {
              id: 9,
              name: "Kittipong Saelim",
              role: "IT_STAFF",
              isActive: true,
            },
          ],
        });
      }
      if (
        url === "/api/staff/tickets/42/actions/31" &&
        init?.method === "PATCH"
      ) {
        writes += 1;
        if (writes === 1) {
          return response({ error: { code: "STALE_WRITE" } }, 409);
        }
        const body = JSON.parse(String(init.body));
        return response({
          action: {
            ...BASE_ACTION,
            status: body.status,
            title: body.title,
            version: 4,
          },
          ticketVersion: 9,
        });
      }
      return response({ error: { code: "NOT_FOUND" } }, 404);
    });
    const onTicketVersionChange = vi.fn();

    render(
      <ActionsTakenPanel
        ticketId={42}
        ticketVersion={7}
        ticketStatus="OPEN"
        canManage
        onTicketVersionChange={onTicketVersionChange}
      />
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Edit Original title" })
    );
    fireEvent.change(screen.getByLabelText("Action title"), {
      target: { value: "My unsaved title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

    expect(await screen.findByTestId("action-conflict")).toHaveTextContent(
      "Latest saved title"
    );
    expect(screen.getByLabelText("Action title")).toHaveValue(
      "My unsaved title"
    );
    expect(writes).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));
    await waitFor(() =>
      expect(screen.getByTestId("action-success")).toBeInTheDocument()
    );
    expect(writes).toBe(2);
    const patchBodies = calls
      .filter((call) => call.init?.method === "PATCH")
      .map((call) => JSON.parse(String(call.init?.body)));
    expect(patchBodies[1]).toMatchObject({
      expectedVersion: 3,
      expectedTicketVersion: 8,
      title: "My unsaved title",
    });
    expect(onTicketVersionChange).toHaveBeenLastCalledWith(
      9,
      BASE_ACTION.updatedAt
    );
  });

  it.each([
    ["COMPLETED", "Completed"],
    ["CANCELLED", "Cancelled"],
  ] as const)(
    "keeps a stale edit read-only when another user makes the action %s",
    async (terminalStatus, terminalLabel) => {
      let actionReads = 0;
      let patchWrites = 0;
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        const url = String(input);
        if (url === "/api/tickets/42/actions") {
          actionReads += 1;
          return response({
            actions: [
              {
                ...BASE_ACTION,
                title: actionReads === 1 ? "Original title" : "Latest title",
                status: actionReads === 1 ? "PLANNED" : terminalStatus,
                result:
                  terminalStatus === "COMPLETED"
                    ? "Completed by the other staff member."
                    : null,
                completedAt:
                  terminalStatus === "COMPLETED"
                    ? "2026-10-07T05:00:00.000Z"
                    : null,
                version: actionReads === 1 ? 2 : 3,
              },
            ],
            ticketVersion: actionReads === 1 ? 7 : 8,
          });
        }
        if (url === "/api/staff/action-assignees") {
          return response({ assignees: [] });
        }
        if (
          url === "/api/staff/tickets/42/actions/31" &&
          init?.method === "PATCH"
        ) {
          patchWrites += 1;
          return response({ error: { code: "STALE_WRITE" } }, 409);
        }
        return response({ error: { code: "NOT_FOUND" } }, 404);
      });

      render(
        <ActionsTakenPanel
          ticketId={42}
          ticketVersion={7}
          ticketStatus="OPEN"
          canManage
        />
      );

      fireEvent.click(
        await screen.findByRole("button", { name: "Edit Original title" })
      );
      fireEvent.change(screen.getByLabelText("Action title"), {
        target: { value: "My unsaved title" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

      expect(await screen.findByTestId("action-conflict")).toHaveTextContent(
        "Latest title"
      );
      expect(screen.getByTestId("action-editor-readonly")).toHaveTextContent(
        `This action is ${terminalLabel} and is read-only. Your unsaved draft is preserved.`
      );
      expect(screen.getByLabelText("Action title")).toHaveValue(
        "My unsaved title"
      );
      expect(screen.getByLabelText("Action title")).toBeDisabled();
      expect(screen.getByLabelText("Action status")).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Save Action" })
      ).toBeDisabled();
      expect(patchWrites).toBe(1);
    }
  );

  it("disables action writes when stale-conflict refresh finds a resolved Ticket", async () => {
    let actionReads = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/tickets/42/actions") {
        actionReads += 1;
        return response({
          actions: [
            {
              ...BASE_ACTION,
              status: "PLANNED",
              completedAt: null,
              title: "Review access logs",
              version: actionReads === 1 ? 2 : 3,
            },
          ],
          ticketVersion: actionReads === 1 ? 7 : 8,
        });
      }
      if (url === "/api/staff/action-assignees") {
        return response({ assignees: [] });
      }
      if (
        url === "/api/staff/tickets/42/actions/31" &&
        init?.method === "PATCH"
      ) {
        return response({ error: { code: "STALE_WRITE" } }, 409);
      }
      return response({ error: { code: "NOT_FOUND" } }, 404);
    });

    function TicketActionsHarness() {
      const [ticketStatus, setTicketStatus] = useState<"OPEN" | "RESOLVED">(
        "OPEN"
      );
      return (
        <ActionsTakenPanel
          ticketId={42}
          ticketVersion={7}
          ticketStatus={ticketStatus}
          canManage
          onRefreshTicket={async () => setTicketStatus("RESOLVED")}
        />
      );
    }

    render(<TicketActionsHarness />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit Review access logs" })
    );
    fireEvent.change(screen.getByLabelText("Action title"), {
      target: { value: "Review the updated access logs" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

    expect(await screen.findByTestId("action-conflict")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Actions are read-only while this Ticket is RESOLVED. Reopen it before making action changes."
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Action" })).toBeNull();
    expect(screen.getByLabelText("Action title")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Action" })).toBeDisabled();
    expect(screen.getByLabelText("Action title")).toHaveValue(
      "Review the updated access logs"
    );
  });

  it("shows the append-only editor and time in read-only action history", async () => {
    const before = {
      title: "Inspect VPN gateway",
      details: "Collected gateway logs.",
      result: null,
      performedById: 9,
      assigneeId: null,
      status: "PLANNED",
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
      version: 1,
      createdAt: BASE_ACTION.createdAt,
      updatedAt: BASE_ACTION.createdAt,
      completedAt: null,
    };
    const calls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      calls.push(url);
      if (url === "/api/tickets/42/actions") {
        return response({
          actions: [
            {
              ...BASE_ACTION,
              title: "Inspect VPN gateway",
              status: "IN_PROGRESS",
            },
          ],
          ticketVersion: 7,
        });
      }
      if (url === "/api/tickets/42/actions/31/history") {
        return response({
          events: [
            {
              id: 1,
              actionId: 31,
              actor: BASE_ACTION.performedBy,
              type: "CREATED",
              previousVersion: null,
              newVersion: 1,
              occurredAt: BASE_ACTION.createdAt,
              before: null,
              after: before,
            },
            {
              id: 2,
              actionId: 31,
              actor: BASE_ACTION.performedBy,
              type: "EDITED",
              previousVersion: 1,
              newVersion: 2,
              occurredAt: "2026-10-06T04:00:00.000Z",
              before,
              after: {
                ...before,
                title: "Restart VPN gateway",
                status: "IN_PROGRESS",
                version: 2,
              },
            },
          ],
        });
      }
      return response({ error: { code: "NOT_FOUND" } }, 404);
    });

    render(
      <ActionsTakenPanel
        ticketId={42}
        ticketVersion={7}
        ticketStatus="OPEN"
        canManage={false}
      />
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "View history for Inspect VPN gateway",
      })
    );

    const historyEvents = await screen.findAllByTestId("action-history-event");
    expect(historyEvents[0]).toHaveTextContent("Kittipong Saelim · CREATED");
    expect(historyEvents[0]).toHaveTextContent("Title: Inspect VPN gateway");
    expect(historyEvents[0]).toHaveTextContent(
      "Action Description: Collected gateway logs."
    );
    expect(historyEvents[1]).toHaveTextContent("Kittipong Saelim · EDITED");
    expect(historyEvents[1]).toHaveTextContent(
      "Title: Inspect VPN gateway → Restart VPN gateway"
    );
    expect(calls).toContain("/api/tickets/42/actions/31/history");
    expect(screen.queryByRole("button", { name: /edit action/i })).toBeNull();
  });

  it("keeps the Ticket usable while action loading fails, then recovers to the empty state", async () => {
    let resolveFirstRead!: (value: Response) => void;
    const firstRead = new Promise<Response>((resolve) => {
      resolveFirstRead = resolve;
    });
    let reads = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      reads += 1;
      if (reads === 1) return firstRead;
      return response({ actions: [], ticketVersion: 7 });
    });

    render(
      <ActionsTakenPanel
        ticketId={42}
        ticketVersion={7}
        ticketStatus="OPEN"
        canManage={false}
      />
    );

    expect(screen.getByTestId("actions-loading")).toBeInTheDocument();
    resolveFirstRead(response({}, 503));
    expect(await screen.findByTestId("actions-failure")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByTestId("actions-empty")).toBeInTheDocument();
    expect(reads).toBe(2);
  });

  it.each([
    [403, "actions-forbidden", /do not have permission/i],
    [404, "actions-not-found", /could not be found/i],
  ] as const)(
    "shows a safe read state for HTTP %s",
    async (status, testId, message) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(response({}, status));

      render(
        <ActionsTakenPanel
          ticketId={42}
          ticketVersion={7}
          ticketStatus="OPEN"
          canManage
        />
      );

      expect(await screen.findByTestId(testId)).toHaveTextContent(message);
      expect(screen.queryByRole("button", { name: "Add Action" })).toBeNull();
    }
  );

  it("refreshes active staff after an inactive assignee is rejected and preserves the edit", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    let assigneeReads = 0;
    let patchWrites = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === "/api/tickets/42/actions") {
        return response({
          actions: [
            { ...BASE_ACTION, status: "IN_PROGRESS", completedAt: null },
          ],
          ticketVersion: 7,
        });
      }
      if (url === "/api/staff/action-assignees") {
        assigneeReads += 1;
        return response({
          assignees:
            assigneeReads === 1
              ? []
              : [
                  {
                    id: 14,
                    name: "Active Staff Member",
                    role: "IT_STAFF",
                    isActive: true,
                  },
                ],
        });
      }
      if (
        url === "/api/staff/tickets/42/actions/31" &&
        init?.method === "PATCH"
      ) {
        patchWrites += 1;
        if (patchWrites === 1) {
          return response({ error: { code: "ASSIGNEE_NOT_ELIGIBLE" } }, 422);
        }
        const body = JSON.parse(String(init.body));
        return response({
          action: {
            ...BASE_ACTION,
            ...body,
            assignee: {
              id: 14,
              name: "Active Staff Member",
              role: "IT_STAFF",
              isActive: true,
            },
            version: 3,
          },
          ticketVersion: 8,
        });
      }
      return response({ error: { code: "NOT_FOUND" } }, 404);
    });

    render(
      <ActionsTakenPanel
        ticketId={42}
        ticketVersion={7}
        ticketStatus="OPEN"
        canManage
      />
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Edit Restart VPN gateway" })
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Action assignee")).toBeEnabled();
    });
    fireEvent.change(screen.getByLabelText("Action title"), {
      target: { value: "Restart VPN gateway safely" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

    expect(
      await screen.findByText(/no longer active IT Staff/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Action title")).toHaveValue(
      "Restart VPN gateway safely"
    );
    await waitFor(() => expect(assigneeReads).toBe(2));
    fireEvent.change(screen.getByLabelText("Action assignee"), {
      target: { value: "14" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

    await waitFor(() =>
      expect(screen.getByTestId("action-success")).toBeInTheDocument()
    );
    expect(patchWrites).toBe(2);
    expect(
      JSON.parse(
        String(
          calls.filter((call) => call.init?.method === "PATCH")[1].init?.body
        )
      )
    ).toMatchObject({ title: "Restart VPN gateway safely", assigneeId: 14 });
  });

  it("confirms terminal cancellation before saving it", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url === "/api/tickets/42/actions") {
        return response({
          actions: [{ ...BASE_ACTION, status: "PLANNED", completedAt: null }],
          ticketVersion: 7,
        });
      }
      if (url === "/api/staff/action-assignees")
        return response({ assignees: [] });
      if (
        url === "/api/staff/tickets/42/actions/31" &&
        init?.method === "PATCH"
      ) {
        return response({
          action: { ...BASE_ACTION, status: "CANCELLED", version: 3 },
          ticketVersion: 8,
        });
      }
      return response({ error: { code: "NOT_FOUND" } }, 404);
    });

    render(
      <ActionsTakenPanel
        ticketId={42}
        ticketVersion={7}
        ticketStatus="OPEN"
        canManage
      />
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit Restart VPN gateway" })
    );
    fireEvent.change(screen.getByLabelText("Action status"), {
      target: { value: "CANCELLED" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

    const confirmation = await screen.findByTestId("action-confirmation");
    expect(confirmation).toHaveTextContent(
      /terminal status.*cannot be edited afterward/i
    );
    expect(confirmation).toHaveAttribute("aria-modal", "true");
    expect(screen.getByTestId("action-dialog-backdrop")).toHaveClass(
      "zg-dialog-backdrop"
    );
    expect(calls.filter((call) => call.init?.method === "PATCH")).toHaveLength(
      0
    );
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByRole("button", { name: "Save Action" })).toHaveFocus();
    expect(screen.getByLabelText("Action status")).toHaveValue("CANCELLED");
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Yes, cancel action" })
    );

    await waitFor(() => {
      expect(screen.getByTestId("action-success")).toHaveTextContent(
        "Action cancelled."
      );
    });
    expect(calls.filter((call) => call.init?.method === "PATCH")).toHaveLength(
      1
    );
    expect(screen.getByTestId("actions-taken-panel")).toHaveFocus();
  });

  it("keeps a stored follow-up note visible when follow-up is turned off and allows clearing it", async () => {
    const patchBodies: Record<string, unknown>[] = [];
    let savedFollowUpNote: string | null = BASE_ACTION.followUpNote;
    let savedFollowUpRequired = true;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/tickets/42/actions") {
        return response({
          actions: [
            {
              ...BASE_ACTION,
              status: "IN_PROGRESS",
              followUpRequired: savedFollowUpRequired,
              followUpNote: savedFollowUpNote,
              completedAt: null,
            },
          ],
          ticketVersion: 7,
        });
      }
      if (url === "/api/staff/action-assignees") {
        return response({
          assignees: [
            {
              id: 9,
              name: "Kittipong Saelim",
              role: "IT_STAFF",
              isActive: true,
            },
          ],
        });
      }
      if (
        url === "/api/staff/tickets/42/actions/31" &&
        init?.method === "PATCH"
      ) {
        const body = JSON.parse(String(init.body));
        patchBodies.push(body);
        savedFollowUpRequired = body.followUpRequired;
        savedFollowUpNote = body.followUpNote;
        return response({
          action: {
            ...BASE_ACTION,
            status: "IN_PROGRESS",
            followUpRequired: savedFollowUpRequired,
            followUpNote: savedFollowUpNote,
            version: patchBodies.length + 2,
          },
          ticketVersion: patchBodies.length + 7,
        });
      }
      return response({ error: { code: "NOT_FOUND" } }, 404);
    });

    render(
      <ActionsTakenPanel
        ticketId={42}
        ticketVersion={7}
        ticketStatus="OPEN"
        canManage
      />
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit Restart VPN gateway" })
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Action assignee")).toBeEnabled();
    });
    fireEvent.click(screen.getByLabelText("Follow-up required"));

    expect(screen.getByLabelText("Follow-up note")).toHaveValue(
      "Check the connection again tomorrow."
    );
    expect(screen.getByLabelText("Follow-up note")).not.toHaveAttribute(
      "aria-required",
      "true"
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

    await waitFor(() => {
      expect(screen.getByTestId("action-success")).toHaveTextContent(
        "Action updated."
      );
    });
    expect(patchBodies[0]).toMatchObject({
      followUpRequired: false,
      followUpNote: "Check the connection again tomorrow.",
    });
    expect(
      within(screen.getByTestId("action-item")).getByText(
        "Check the connection again tomorrow."
      )
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Edit Restart VPN gateway" })
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Action assignee")).toBeEnabled();
    });
    fireEvent.change(screen.getByLabelText("Follow-up note"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

    await waitFor(() => {
      expect(screen.getByTestId("action-success")).toHaveTextContent(
        "Action updated."
      );
    });
    expect(patchBodies).toHaveLength(2);
    expect(patchBodies[1]).toMatchObject({
      followUpRequired: false,
      followUpNote: null,
    });
    expect(
      within(screen.getByTestId("action-item")).getByText("Not provided")
    ).toBeInTheDocument();
  });

  it.each(["network loss", "server error"] as const)(
    "retries an uncertain create after %s with the same idempotency key and exact payload",
    async (firstFailure) => {
      const calls: { url: string; init?: RequestInit }[] = [];
      let postCount = 0;
      let actionReads = 0;
      const onTicketVersionChange = vi.fn();
      const onRefreshTicket = vi.fn();
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        const url = String(input);
        calls.push({ url, init });
        if (url === "/api/tickets/42/actions") {
          actionReads += 1;
          return actionReads === 1
            ? response({ actions: [], ticketVersion: 7 })
            : response({
                actions: [
                  {
                    ...BASE_ACTION,
                    id: 32,
                    title: "Replace network cable",
                    status: "PLANNED",
                    version: 1,
                  },
                ],
                ticketVersion: 11,
              });
        }
        if (url === "/api/staff/action-assignees")
          return response({ assignees: [] });
        if (
          url === "/api/staff/tickets/42/actions" &&
          init?.method === "POST"
        ) {
          postCount += 1;
          if (postCount === 1) {
            if (firstFailure === "network loss")
              throw new Error("connection lost");
            return response({ error: { code: "UNEXPECTED" } }, 503);
          }
          const body = JSON.parse(String(init.body));
          return response(
            {
              action: {
                ...BASE_ACTION,
                id: 32,
                title: body.title,
                details: body.details,
                result: null,
                status: "PLANNED",
                followUpRequired: false,
                followUpNote: null,
                attachmentNotes: null,
                version: 1,
              },
              ticketVersion: 8,
            },
            201
          );
        }
        return response({ error: { code: "NOT_FOUND" } }, 404);
      });

      render(
        <ActionsTakenPanel
          ticketId={42}
          ticketVersion={7}
          ticketStatus="OPEN"
          canManage
          onTicketVersionChange={onTicketVersionChange}
          onRefreshTicket={onRefreshTicket}
        />
      );
      fireEvent.click(
        await screen.findByRole("button", { name: "Add Action" })
      );
      fireEvent.change(screen.getByLabelText("Action title"), {
        target: { value: "Replace network cable" },
      });
      fireEvent.change(screen.getByLabelText("Action description"), {
        target: { value: "Replaced the damaged cable and checked the link." },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save Action" }));

      expect(
        await screen.findByRole("button", { name: "Retry same create" })
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Action title")).toBeDisabled();
      fireEvent.click(
        screen.getByRole("button", { name: "Retry same create" })
      );

      expect(
        await screen.findByText("Replace network cable")
      ).toBeInTheDocument();
      await waitFor(() => expect(actionReads).toBe(2));
      const postCalls = calls.filter((call) => call.init?.method === "POST");
      expect(postCalls).toHaveLength(2);
      expect(postCalls[1].init?.headers).toEqual(postCalls[0].init?.headers);
      expect(postCalls[1].init?.body).toEqual(postCalls[0].init?.body);
      expect(onTicketVersionChange.mock.calls.at(-1)).toEqual([11]);
      expect(onRefreshTicket).toHaveBeenCalledOnce();
    }
  );

  it("retries a failed history request without collapsing the history panel", async () => {
    let historyReads = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/tickets/42/actions") {
        return response({ actions: [BASE_ACTION], ticketVersion: 7 });
      }
      if (url === "/api/tickets/42/actions/31/history") {
        historyReads += 1;
        if (historyReads === 1) throw new Error("network error");
        return response({ events: [] });
      }
      return response({ error: { code: "NOT_FOUND" } }, 404);
    });

    render(
      <ActionsTakenPanel
        ticketId={42}
        ticketVersion={7}
        ticketStatus="OPEN"
        canManage={false}
      />
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "View history for Restart VPN gateway",
      })
    );
    expect(
      await screen.findByText(/unable to load action history/i)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByText(/no action history is available/i)
    ).toBeInTheDocument();
    expect(historyReads).toBe(2);
  });
});
