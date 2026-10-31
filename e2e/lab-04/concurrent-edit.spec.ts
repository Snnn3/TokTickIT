import { expect, test, type Page } from "@playwright/test";
import {
  ActionStatus,
  PrismaClient,
} from "../../server/node_modules/@prisma/client";
import {
  DASHBOARD_ACCOUNTS,
  DASHBOARD_PASSWORD,
} from "../../server/tests/helpers/dashboard-fixtures";
import { requireDisposableDatabase } from "../../server/tests/helpers/disposable-database";
import { captureEvidence } from "./evidence";
import { createWorkflowTicket } from "./workflow-fixtures";

const db = new PrismaClient({ datasourceUrl: requireDisposableDatabase() });
let ticketId: number;

test.afterAll(async () => {
  await db.$disconnect();
});

test.beforeEach(async () => {
  ticketId = (await createWorkflowTicket(db)).id;
});

async function signIn(page: Page) {
  await page.goto("/login");
  await page.locator("#login-email").fill(DASHBOARD_ACCOUNTS.staff.email);
  await page.locator("#login-password").fill(DASHBOARD_PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByTestId("identity-chip")).toContainText(
    DASHBOARD_ACCOUNTS.staff.name
  );
}

test("E4-04 two Staff sessions preserve a stale resolution draft for explicit retry", async ({
  browser,
}, testInfo) => {
  await db.actionTaken.create({
    data: {
      ticketId,
      title: "Completed prerequisite",
      details: "Verify the replacement adapter.",
      result: "Connection verified.",
      performedById: (
        await db.user.findUniqueOrThrow({
          where: { email: DASHBOARD_ACCOUNTS.staff.email },
        })
      ).id,
      status: ActionStatus.COMPLETED,
      completedAt: new Date(),
    },
  });
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  try {
    await Promise.all([signIn(firstPage), signIn(secondPage)]);
    await Promise.all([
      firstPage.goto(`/staff/tickets/${ticketId}`),
      secondPage.goto(`/staff/tickets/${ticketId}`),
    ]);
    await Promise.all([
      expect(firstPage.getByTestId("staff-detail-view")).toBeVisible(),
      expect(secondPage.getByTestId("staff-detail-view")).toBeVisible(),
    ]);

    await firstPage.getByTestId("priority-select").selectOption("HIGH");
    await expect(firstPage.getByTestId("priority-success")).toBeVisible();
    const resolutionDraft = "Replaced adapter; requester confirmed recovery.";
    await secondPage
      .getByTestId("resolution-summary-input")
      .fill(resolutionDraft);
    await secondPage.getByLabel("New status").selectOption("IN_PROGRESS");
    await secondPage.getByTestId("status-save-btn").click();
    await expect(secondPage.getByTestId("status-error")).toContainText(
      "This ticket changed. The latest ticket has been loaded"
    );
    await expect(
      secondPage.getByTestId("resolution-summary-input")
    ).toHaveValue(resolutionDraft);
    await expect(secondPage.getByTestId("priority-select")).toHaveValue("HIGH");
    await captureEvidence(
      secondPage,
      testInfo,
      "ticket-workflow",
      "concurrent-edit-conflict-desktop",
      "E4-04",
      "IT_STAFF",
      "A second Staff session receives STALE_WRITE, sees the latest priority, and retains its unsaved resolution summary for review.",
      secondPage.getByTestId("status-error")
    );

    await secondPage.getByLabel("New status").selectOption("IN_PROGRESS");
    await secondPage.getByTestId("status-save-btn").click();
    await expect(secondPage.getByTestId("status-success")).toBeVisible();
    await secondPage
      .getByTestId("resolution-summary-input")
      .fill(resolutionDraft);
    await secondPage.getByLabel("New status").selectOption("RESOLVED");
    await secondPage.getByTestId("status-save-btn").click();
    await expect(secondPage.getByTestId("status-success")).toBeVisible();
    const ticket = await db.ticket.findUniqueOrThrow({
      where: { id: ticketId },
    });
    expect(ticket.status).toBe("RESOLVED");
    expect(ticket.itPriority).toBe("HIGH");
    expect(ticket.resolutionSummary).toBe(resolutionDraft);
    expect(ticket.version).toBe(4);
  } finally {
    await secondContext.close();
    await firstContext.close();
  }
});

test("E4-04 retries a committed Action create with its original idempotency key", async ({
  page,
}, testInfo) => {
  await signIn(page);
  await page.goto(`/staff/tickets/${ticketId}`);
  await expect(page.getByTestId("actions-taken-panel")).toBeVisible();
  const idempotencyKeys: string[] = [];
  let dropFirstResponse = true;
  await page.route(
    `**/api/staff/tickets/${ticketId}/actions`,
    async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      idempotencyKeys.push(
        (await route.request().allHeaders())["idempotency-key"] ?? ""
      );
      if (dropFirstResponse) {
        dropFirstResponse = false;
        const committed = await route.fetch();
        expect(committed.status()).toBe(201);
        await route.abort("connectionreset");
        return;
      }
      await route.continue();
    }
  );

  await page.getByTestId("action-add-btn").click();
  const editor = page.getByTestId("action-editor");
  await editor.getByLabel("Action title").fill("Retry-safe action");
  await editor.getByLabel("Action description").fill("Verify one write only.");
  await editor.getByRole("button", { name: "Save Action" }).click();
  await expect(page.getByTestId("action-form-error")).toContainText(
    "Retry sends the exact same request"
  );
  await editor.getByRole("button", { name: "Retry same create" }).click();
  const action = page
    .getByTestId("action-item")
    .filter({ hasText: "Retry-safe action" });
  await expect(action).toBeVisible();
  expect(idempotencyKeys).toHaveLength(2);
  expect(idempotencyKeys[0]).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  );
  expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
  const storedAction = await db.actionTaken.findFirstOrThrow({
    where: { ticketId, title: "Retry-safe action" },
  });
  expect(await db.actionTaken.count({ where: { ticketId } })).toBe(1);
  expect(
    await db.actionEvent.count({ where: { actionId: storedAction.id } })
  ).toBe(1);
  expect(await db.actionCreationRequest.count({ where: { ticketId } })).toBe(1);
  expect(
    (await db.ticket.findUniqueOrThrow({ where: { id: ticketId } })).version
  ).toBe(2);
  await captureEvidence(
    page,
    testInfo,
    "actions-taken",
    "lost-response-replay-desktop",
    "E4-04",
    "IT_STAFF",
    "The first committed create response is lost; retry with the identical key confirms one Action, one event, one request, and a single Ticket-version increment.",
    action
  );
});
