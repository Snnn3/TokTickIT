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

test.describe("E-02 staff ticket flow and authorization evidence", () => {
  test.beforeEach(() => resetSeed());
  test.afterEach(() => cleanupE2EFixtures());

  test("queue through claim, prioritise, resolve, comment, note, reopen, and API refusals", async ({
    browser,
    page: staffPage,
  }) => {
    await signInAndChangePassword(staffPage, ACCOUNTS.staff, "E2E.Staff!2026");

    await expect(staffPage.getByTestId("staff-queue-view")).toBeVisible();
    await staffPage.locator("#queue-search").fill(SEED_NEW_TICKET);
    const seedRow = staffPage
      .getByTestId("queue-row")
      .filter({ hasText: SEED_NEW_TICKET });
    await expect(seedRow).toBeVisible();
    await seedRow.getByRole("button", { name: "Open" }).click();
    await expect(staffPage).toHaveURL(/\/staff\/tickets\/\d+$/);
    await expect(staffPage.getByTestId("staff-detail-number")).toHaveText(
      SEED_NEW_TICKET
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

    await staffPage.getByTestId("status-select").selectOption("RESOLVED");
    await staffPage
      .getByTestId("resolution-summary-input")
      .fill("Reconfigured the access point and confirmed a stable connection.");
    await staffPage.getByTestId("status-save-btn").click();
    await expect(staffPage.getByTestId("status-success")).toBeVisible();
    await expect(staffPage.getByTestId("staff-detail-view")).toContainText(
      "RESOLVED"
    );

    const requesterContext = await browser.newContext({
      baseURL: "http://localhost:5173",
    });
    const requesterPage = await requesterContext.newPage();
    await signInAndChangePassword(
      requesterPage,
      ACCOUNTS.requester,
      "E2E.Requester!2026"
    );
    await requesterPage.locator("#ticket-search").fill(SEED_NEW_TICKET);
    await requesterPage
      .getByTestId("tickets-desktop-table")
      .getByRole("button", { name: SEED_NEW_TICKET })
      .click();
    await expect(
      requesterPage.getByTestId("resolution-summary-panel")
    ).toBeVisible();
    await requesterPage.getByTestId("reopen-btn").click();
    await requesterPage.getByTestId("reopen-confirm-btn").click();
    await expect(requesterPage.getByTestId("reopen-success")).toBeVisible();

    const queue = await getQueue(staffPage);
    const ownSeedTicket = queue.tickets.find(
      (ticket) => ticket.number === SEED_NEW_TICKET
    );
    const crossOwnerTicket = queue.tickets.find(
      (ticket) => ticket.number === SEED_CROSS_OWNER_TICKET
    );
    expect(ownSeedTicket).toBeDefined();
    expect(crossOwnerTicket).toBeDefined();

    const requesterNotesResponse = await requestJson(
      requesterPage,
      `/api/staff/tickets/${ownSeedTicket?.id}/notes`
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
      { method: "PATCH", body: { ownerId: staffIdentity.body.user.id } }
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
          path: `/api/staff/tickets/${ownSeedTicket?.id}/notes`,
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
