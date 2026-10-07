import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  ACCOUNTS,
  assertNoHorizontalOverflow,
  captureScreenshot,
  cleanupE2EFixtures,
  getQueue,
  requestJson,
  resetSeed,
  signInAndChangePassword,
  VIEWPORTS,
  writeEvidence,
} from "./support";

const SEED_NEW_TICKET = "TKT-2026-SEED-01";
const SEED_CROSS_OWNER_TICKET = "TKT-2026-SEED-02";

type ActionWriteResponse = {
  action: { id: number; version: number };
  ticketVersion: number;
};

test.describe("E-02 staff ticket flow and authorization evidence", () => {
  test.beforeEach(() => resetSeed());
  test.afterEach(() => cleanupE2EFixtures());

  test("queue through claim, prioritise, resolve, comment, note, reopen, and API refusals", async ({
    browser,
    page: staffPage,
  }) => {
    const requesterContext = await browser.newContext({
      baseURL: "http://localhost:5173",
    });
    const requesterPage = await requesterContext.newPage();
    await signInAndChangePassword(
      requesterPage,
      ACCOUNTS.requester,
      "E2E.Requester!2026"
    );

    const workflowSummary = "E2E Lab4 staff workflow " + Date.now();
    await requesterPage.goto("/tickets/new");
    await expect(requesterPage.getByTestId("create-ticket-form")).toBeVisible();
    await requesterPage
      .locator("#category-select")
      .selectOption({ label: "Account and Access" });
    await requesterPage
      .locator("#system-select")
      .selectOption({ label: "Email" });
    await requesterPage.locator("#priority-select").selectOption("MEDIUM");
    await requesterPage.locator("#summary-input").fill(workflowSummary);
    await requesterPage
      .locator("#description-input")
      .fill("Verify the campus Wi-Fi access point and requester reopen flow.");
    await requesterPage.getByRole("button", { name: "Submit Ticket" }).click();
    const createdTicketPanel = requesterPage.getByTestId("success-panel");
    await expect(createdTicketPanel).toBeVisible();
    const workflowTicketNumber = (
      await createdTicketPanel.getByTestId("success-ticket-number").innerText()
    ).trim();
    expect(workflowTicketNumber).toMatch(/^TKT-/);

    await signInAndChangePassword(staffPage, ACCOUNTS.staff, "E2E.Staff!2026");

    await expect(staffPage.getByTestId("staff-queue-view")).toBeVisible();
    await staffPage.locator("#queue-search").fill(workflowTicketNumber);
    const workflowRow = staffPage
      .getByTestId("queue-row")
      .filter({ hasText: workflowTicketNumber });
    await expect(workflowRow).toBeVisible();
    await workflowRow.getByRole("button", { name: "Open" }).click();
    await expect(staffPage).toHaveURL(/\/staff\/tickets\/\d+$/);
    await expect(staffPage.getByTestId("staff-detail-number")).toHaveText(
      workflowTicketNumber
    );

    await staffPage.getByTestId("claim-btn").click();
    await expect(staffPage.getByTestId("owner-success")).toBeVisible();
    await staffPage.getByTestId("priority-select").selectOption("MEDIUM");
    await expect(staffPage.getByTestId("priority-success")).toBeVisible();

    await staffPage.getByTestId("status-select").selectOption("IN_PROGRESS");
    await staffPage.getByTestId("status-save-btn").click();
    await expect(staffPage.getByTestId("status-success")).toBeVisible();

    const publicComment = "Staff verified the campus Wi-Fi access point.";
    await staffPage.getByTestId("comment-composer").fill(publicComment);
    await staffPage.getByTestId("comment-post-btn").click();
    await expect(staffPage.getByTestId("comment-list")).toContainText(
      publicComment
    );

    const internalNote = "Checked the access point logs before resolution.";
    await staffPage.getByTestId("note-composer").fill(internalNote);
    await staffPage.getByTestId("note-post-btn").click();
    await expect(staffPage.getByTestId("note-list")).toContainText(
      internalNote
    );

    const ticket = (await getQueue(staffPage)).tickets.find(
      (candidate) => candidate.number === workflowTicketNumber
    );
    expect(ticket).toBeDefined();
    if (!ticket) {
      throw new Error("The E2E ticket for the staff flow was not found.");
    }

    const currentActions = await requestJson<{ ticketVersion: number }>(
      staffPage,
      "/api/tickets/" + ticket.id + "/actions"
    );
    expect(currentActions.status).toBe(200);

    const createdAction = await requestJson<ActionWriteResponse>(
      staffPage,
      "/api/staff/tickets/" + ticket.id + "/actions",
      {
        method: "POST",
        body: {
          title: "Reconfigure campus Wi-Fi access point",
          details: "Verify the access point configuration and connectivity.",
          expectedTicketVersion: currentActions.body.ticketVersion,
        },
        headers: { "Idempotency-Key": randomUUID() },
      }
    );
    expect(createdAction.status).toBe(201);

    const startedAction = await requestJson<ActionWriteResponse>(
      staffPage,
      "/api/staff/tickets/" +
        ticket.id +
        "/actions/" +
        createdAction.body.action.id,
      {
        method: "PATCH",
        body: {
          status: "IN_PROGRESS",
          expectedVersion: createdAction.body.action.version,
          expectedTicketVersion: createdAction.body.ticketVersion,
        },
      }
    );
    expect(startedAction.status).toBe(200);

    const completedAction = await requestJson<ActionWriteResponse>(
      staffPage,
      "/api/staff/tickets/" +
        ticket.id +
        "/actions/" +
        startedAction.body.action.id,
      {
        method: "PATCH",
        body: {
          status: "COMPLETED",
          result:
            "The access point was reconfigured and the connection is stable.",
          expectedVersion: startedAction.body.action.version,
          expectedTicketVersion: startedAction.body.ticketVersion,
        },
      }
    );
    expect(completedAction.status).toBe(200);

    await staffPage.reload();
    await expect(staffPage.getByTestId("staff-detail-view")).toBeVisible();
    await staffPage.getByTestId("status-select").selectOption("RESOLVED");
    await staffPage
      .getByTestId("resolution-summary-input")
      .fill("Reconfigured the access point and confirmed a stable connection.");
    await staffPage.getByTestId("status-save-btn").click();
    await expect(staffPage.getByTestId("status-success")).toBeVisible();
    await expect(staffPage.getByTestId("staff-detail-view")).toContainText(
      "RESOLVED"
    );

    await requesterPage.goto("/tickets");
    await expect(
      requesterPage.getByRole("heading", { name: "My Tickets" })
    ).toBeVisible();
    await requesterPage.locator("#ticket-search").fill(workflowTicketNumber);
    await requesterPage
      .getByTestId("tickets-desktop-table")
      .getByRole("button", { name: workflowTicketNumber })
      .click();
    await expect(
      requesterPage.getByTestId("resolution-summary-panel")
    ).toBeVisible();
    await requesterPage.getByTestId("reopen-btn").click();
    await requesterPage.getByTestId("reopen-confirm-btn").click();
    await expect(requesterPage.getByTestId("reopen-success")).toBeVisible();

    const queue = await getQueue(staffPage);
    const workflowTicket = queue.tickets.find(
      (ticket) => ticket.number === workflowTicketNumber
    );
    const crossOwnerTicket = queue.tickets.find(
      (ticket) => ticket.number === SEED_CROSS_OWNER_TICKET
    );
    expect(workflowTicket).toBeDefined();
    expect(crossOwnerTicket).toBeDefined();

    const requesterNotesResponse = await requestJson(
      requesterPage,
      `/api/staff/tickets/${workflowTicket?.id}/notes`
    );
    const crossOwnerResponse = await requestJson(
      requesterPage,
      `/api/tickets/${crossOwnerTicket?.id}`
    );

    await staffPage.goto("/tickets/new");
    await staffPage.locator("#category-select").selectOption({
      label: "Account and Access",
    });
    await staffPage.locator("#system-select").selectOption({ label: "Email" });
    await staffPage.locator("#priority-select").selectOption("LOW");
    await staffPage
      .locator("#summary-input")
      .fill("Staff self-service evidence ticket");
    await staffPage
      .locator("#description-input")
      .fill("Created only to prove the self-service operation guard.");
    await staffPage.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(staffPage.getByTestId("success-panel")).toBeVisible();
    const ownTicketNumber = (
      await staffPage.getByTestId("success-ticket-number").textContent()
    )?.trim();
    expect(ownTicketNumber).toMatch(/^TKT-/);

    const queueAfterCreate = await getQueue(staffPage);
    const ownTicket = queueAfterCreate.tickets.find(
      (ticket) => ticket.number === ownTicketNumber
    );
    expect(ownTicket).toBeDefined();
    const staffIdentity = await requestJson<{
      user: { id: number };
    }>(staffPage, "/api/auth/me");
    expect(staffIdentity.status).toBe(200);

    const selfOwnerResponse = await requestJson(
      staffPage,
      `/api/staff/tickets/${ownTicket?.id}/owner`,
      {
        method: "PATCH",
        body: {
          ownerId: staffIdentity.body.user.id,
          expectedVersion: ownTicket?.version,
        },
      }
    );
    const selfNotesResponse = await requestJson(
      staffPage,
      `/api/staff/tickets/${ownTicket?.id}/notes`,
      { method: "POST", body: { body: "This must be refused." } }
    );

    writeEvidence("authorization.json", {
      capturedAt: new Date().toISOString(),
      cases: [
        {
          case: "requester-refused-internal-notes",
          method: "GET",
          path: `/api/staff/tickets/${workflowTicket?.id}/notes`,
          status: requesterNotesResponse.status,
          expectedStatus: 403,
          body: requesterNotesResponse.body,
        },
        {
          case: "requester-cross-owner-access-refused",
          method: "GET",
          path: `/api/tickets/${crossOwnerTicket?.id}`,
          status: crossOwnerResponse.status,
          expectedStatus: 403,
          body: crossOwnerResponse.body,
        },
        {
          case: "staff-self-filed-owner-operation-refused",
          method: "PATCH",
          path: `/api/staff/tickets/${ownTicket?.id}/owner`,
          status: selfOwnerResponse.status,
          expectedStatus: 403,
          body: selfOwnerResponse.body,
        },
        {
          case: "staff-self-filed-internal-note-refused",
          method: "POST",
          path: `/api/staff/tickets/${ownTicket?.id}/notes`,
          status: selfNotesResponse.status,
          expectedStatus: 403,
          body: selfNotesResponse.body,
        },
      ],
    });

    expect(requesterNotesResponse.status).toBe(403);
    expect(crossOwnerResponse.status).toBe(403);
    expect(selfOwnerResponse.status).toBe(403);
    expect(selfNotesResponse.status).toBe(403);
    await requesterContext.close();
  });

  test("captures the staff queue and ticket detail at all required widths", async ({
    browser,
  }) => {
    const accounts = [
      ACCOUNTS.staff,
      ACCOUNTS.secondStaff,
      ACCOUNTS.thirdStaff,
    ];
    const viewportEntries = Object.entries(VIEWPORTS) as [
      keyof typeof VIEWPORTS,
      (typeof VIEWPORTS)[keyof typeof VIEWPORTS],
    ][];

    for (const [[viewportName, viewport], account] of viewportEntries.map(
      (entry, index) => [entry, accounts[index]] as const
    )) {
      const context = await browser.newContext({
        baseURL: "http://localhost:5173",
        viewport,
      });
      const page = await context.newPage();
      await signInAndChangePassword(page, account, `E2E.${viewportName}!2026`);
      await page.goto("/staff/queue");
      await expect(page.getByTestId("staff-queue-view")).toBeVisible();
      await page.keyboard.press("Tab");
      await captureScreenshot(page, "staff-queue", `${viewportName}.png`);
      await assertNoHorizontalOverflow(page);

      const queue = await getQueue(page);
      const seedTicket = queue.tickets.find(
        (ticket) => ticket.number === SEED_NEW_TICKET
      );
      expect(seedTicket).toBeDefined();
      await page.goto(`/staff/tickets/${seedTicket?.id}`);
      await expect(page.getByTestId("staff-detail-view")).toBeVisible();
      await page.keyboard.press("Tab");
      await captureScreenshot(
        page,
        "staff-ticket-detail",
        `${viewportName}.png`
      );
      await assertNoHorizontalOverflow(page);
      await context.close();
    }
  });
});
