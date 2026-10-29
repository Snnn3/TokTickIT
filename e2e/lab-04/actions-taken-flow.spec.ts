import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "../../server/node_modules/@prisma/client";
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

async function signIn(
  page: Page,
  account: keyof typeof DASHBOARD_ACCOUNTS = "staff"
) {
  await page.goto("/login");
  await page.locator("#login-email").fill(DASHBOARD_ACCOUNTS[account].email);
  await page.locator("#login-password").fill(DASHBOARD_PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByTestId("identity-chip")).toContainText(
    DASHBOARD_ACCOUNTS[account].name
  );
}

async function openStaffTicket(page: Page) {
  await page.goto(`/staff/tickets/${ticketId}`);
  await expect(page.getByTestId("staff-detail-view")).toBeVisible();
  await expect(page.getByTestId("actions-taken-panel")).toBeVisible();
}

test("E4-01 IT Staff validates, assigns, edits, completes and cancels two Actions Taken", async ({
  page,
}, testInfo) => {
  await signIn(page);
  await openStaffTicket(page);
  await page.setViewportSize({ width: 1366, height: 900 });

  await page.getByTestId("action-add-btn").click();
  const editor = page.getByTestId("action-editor");
  await editor.getByLabel("Action title").fill("Network adapter inspection");
  await editor
    .getByLabel("Action description")
    .fill("Check the adapter and verify the connection.");
  await editor.getByLabel("Follow-up required").check();
  await editor.getByRole("button", { name: "Save Action" }).click();
  await expect(
    editor.getByText(
      "A follow-up note is required when follow-up is enabled.",
      { exact: true }
    )
  ).toBeVisible();
  await captureEvidence(
    page,
    testInfo,
    "actions-taken",
    "validation-desktop",
    "E4-01",
    "IT_STAFF",
    "A required follow-up note is explained beside the invalid Action Taken form and no request is submitted.",
    editor
  );

  await editor
    .getByLabel("Follow-up note")
    .fill("Check stability again tomorrow.");
  const assignee = editor.getByLabel("Action assignee");
  await expect(assignee).toContainText(DASHBOARD_ACCOUNTS.secondStaff.name);
  await assignee.selectOption({ label: DASHBOARD_ACCOUNTS.secondStaff.name });
  await editor.getByRole("button", { name: "Save Action" }).click();

  const firstAction = page
    .getByTestId("action-item")
    .filter({ hasText: "Network adapter inspection" });
  await expect(firstAction).toContainText("Dashboard Alice");
  await expect(firstAction).toContainText(DASHBOARD_ACCOUNTS.secondStaff.name);
  await expect(firstAction).toContainText("Check stability again tomorrow.");

  await firstAction
    .getByRole("button", { name: "Edit Network adapter inspection" })
    .click();
  await editor.getByLabel("Action status").selectOption("IN_PROGRESS");
  await editor.getByRole("button", { name: "Save Action" }).click();
  await expect(firstAction.getByTestId("action-status")).toHaveText(
    "In Progress"
  );

  await firstAction
    .getByRole("button", { name: "Edit Network adapter inspection" })
    .click();
  await editor.getByLabel("Action status").selectOption("COMPLETED");
  await editor
    .getByLabel("Action result")
    .fill("Replaced the adapter and verified the connection.");
  await editor.getByRole("button", { name: "Save Action" }).click();
  await expect(firstAction.getByTestId("action-status")).toHaveText(
    "Completed"
  );
  await expect(firstAction).toContainText(
    "Replaced the adapter and verified the connection."
  );
  await firstAction
    .getByRole("button", {
      name: "View history for Network adapter inspection",
    })
    .click();
  await expect(
    firstAction.getByTestId("action-history-event").first()
  ).toContainText(DASHBOARD_ACCOUNTS.staff.name);

  await page.getByTestId("action-add-btn").click();
  await editor.getByLabel("Action title").fill("Firewall rule audit");
  await editor.getByLabel("Action description").fill("Review the active rule.");
  await editor.getByRole("button", { name: "Save Action" }).click();
  const secondAction = page
    .getByTestId("action-item")
    .filter({ hasText: "Firewall rule audit" });
  await expect(secondAction).toBeVisible();
  await secondAction
    .getByRole("button", { name: "Edit Firewall rule audit" })
    .click();
  await editor.getByLabel("Action status").selectOption("CANCELLED");
  await editor.getByRole("button", { name: "Save Action" }).click();
  const cancelDialog = page.getByTestId("action-confirmation");
  await expect(cancelDialog).toBeVisible();
  await expect(cancelDialog).toHaveAttribute("aria-modal", "true");
  await expect(
    cancelDialog.getByRole("button", { name: "Yes, cancel action" })
  ).toBeFocused();
  await cancelDialog
    .getByRole("button", { name: "Yes, cancel action" })
    .click();
  await expect(secondAction.getByTestId("action-status")).toHaveText(
    "Cancelled"
  );
  const hideHistory = firstAction.getByRole("button", {
    name: "Hide history for Network adapter inspection",
  });
  if (await hideHistory.count()) await hideHistory.click();

  for (const viewport of [
    { width: 1366, height: 900, name: "populated-desktop" },
    { width: 768, height: 1024, name: "populated-tablet" },
    { width: 375, height: 812, name: "populated-mobile" },
  ]) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1
      )
    ).toBe(true);
    const visibleDetails = [
      firstAction.getByRole("heading", {
        name: "Network adapter inspection",
      }),
      firstAction.getByText(
        "Replaced the adapter and verified the connection.",
        { exact: true }
      ),
      firstAction.getByText(DASHBOARD_ACCOUNTS.staff.name, { exact: true }),
    ];
    await firstAction.scrollIntoViewIfNeeded();
    if (viewport.name === "populated-mobile") {
      const scrollUp = await page.evaluate(() => {
        const navbar = document.querySelector<HTMLElement>(".zg-header");
        const heading = document.querySelector<HTMLElement>(
          "#actions-taken-heading"
        );
        const addActionButton = document.querySelector<HTMLElement>(
          '[data-testid="action-add-btn"]'
        );
        if (!navbar || !heading || !addActionButton) return 0;
        return Math.max(
          0,
          navbar.getBoundingClientRect().bottom +
            32 -
            Math.min(
              heading.getBoundingClientRect().top,
              addActionButton.getBoundingClientRect().top
            )
        );
      });
      await page.evaluate((pixels) => window.scrollBy(0, -pixels), scrollUp);
      const navbarBounds = await page.locator(".zg-header").boundingBox();
      const headingBounds = await page
        .locator("#actions-taken-heading")
        .boundingBox();
      const addActionBounds = await page
        .getByTestId("action-add-btn")
        .boundingBox();
      if (!navbarBounds || !headingBounds || !addActionBounds) {
        throw new Error("Mobile Actions Taken evidence is not fully rendered");
      }
      expect(headingBounds.y).toBeGreaterThanOrEqual(
        navbarBounds.y + navbarBounds.height
      );
      expect(addActionBounds.y).toBeGreaterThanOrEqual(
        navbarBounds.y + navbarBounds.height
      );
      expect(addActionBounds.y + addActionBounds.height).toBeLessThanOrEqual(
        viewport.height
      );
    }
    for (const detail of visibleDetails) {
      await expect(detail).toBeVisible();
      const bounds = await detail.evaluate((element) => {
        const { top, bottom } = element.getBoundingClientRect();
        return { top, bottom, height: window.innerHeight };
      });
      expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
    }
    await captureEvidence(
      page,
      testInfo,
      "actions-taken",
      viewport.name,
      "E4-01",
      "IT_STAFF",
      "The captured viewport shows the completed Action title, result, and performer; the journey also verifies a cancelled Action and no horizontal overflow."
    );
  }
});

test("E4-01 Administrator can create an action and Requester history remains read-only", async ({
  browser,
}, testInfo) => {
  const adminContext = await browser.newContext();
  const requesterContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const requesterPage = await requesterContext.newPage();
  try {
    await signIn(adminPage, "admin");
    await openStaffTicket(adminPage);
    await adminPage.getByTestId("action-add-btn").click();
    const editor = adminPage.getByTestId("action-editor");
    await editor.getByLabel("Action title").fill("Administrator verification");
    await editor
      .getByLabel("Action description")
      .fill("Confirm the service is available.");
    await editor.getByRole("button", { name: "Save Action" }).click();

    const action = adminPage
      .getByTestId("action-item")
      .filter({ hasText: "Administrator verification" });
    await expect(action).toContainText(DASHBOARD_ACCOUNTS.admin.name);
    const storedAction = await db.actionTaken.findFirstOrThrow({
      where: { ticketId, title: "Administrator verification" },
      include: { performedBy: true },
    });
    expect(storedAction.performedBy.name).toBe(DASHBOARD_ACCOUNTS.admin.name);

    await signIn(requesterPage, "requester");
    await requesterPage.goto(`/tickets/${ticketId}`);
    await expect(requesterPage.getByTestId("ticket-detail-view")).toBeVisible();
    const requesterAction = requesterPage
      .getByTestId("action-item")
      .filter({ hasText: "Administrator verification" });
    await expect(requesterAction).toContainText(DASHBOARD_ACCOUNTS.admin.name);
    await expect(requesterPage.getByTestId("action-add-btn")).toHaveCount(0);
    await expect(
      requesterAction.getByRole("button", { name: /^Edit / })
    ).toHaveCount(0);
    await requesterAction
      .getByRole("button", {
        name: "View history for Administrator verification",
      })
      .click();
    await expect(
      requesterAction.getByTestId("action-history-event").first()
    ).toBeVisible();
    await captureEvidence(
      requesterPage,
      testInfo,
      "actions-taken",
      "requester-read-only-desktop",
      "E4-01",
      "REQUESTER",
      "The ticket owner can read the Administrator's Action Taken and history but has no create or edit controls.",
      requesterAction
    );
  } finally {
    await requesterContext.close();
    await adminContext.close();
  }
});

test("E4-01 rejects an assignee deactivated after the picker loaded and preserves the draft", async ({
  page,
}, testInfo) => {
  const secondStaff = await db.user.findUniqueOrThrow({
    where: { email: DASHBOARD_ACCOUNTS.secondStaff.email },
  });
  await signIn(page);
  await openStaffTicket(page);
  await page.getByTestId("action-add-btn").click();
  const editor = page.getByTestId("action-editor");
  await editor.getByLabel("Action title").fill("Assignment race check");
  await editor
    .getByLabel("Action description")
    .fill("Verify active assignment.");
  const assignee = editor.getByLabel("Action assignee");
  await expect(assignee).toContainText(secondStaff.name);
  await assignee.selectOption({ label: secondStaff.name });

  await db.user.update({
    where: { id: secondStaff.id },
    data: { isActive: false },
  });
  try {
    await editor.getByRole("button", { name: "Save Action" }).click();
    await expect(page.getByTestId("action-form-error")).toContainText(
      "That staff member is no longer eligible"
    );
    await expect(editor.getByLabel("Action title")).toHaveValue(
      "Assignment race check"
    );
    await captureEvidence(
      page,
      testInfo,
      "actions-taken",
      "inactive-assignee-error-desktop",
      "E4-01",
      "IT_STAFF",
      "A stale selection of a newly inactive assignee is rejected safely while the user's draft remains visible.",
      page.getByTestId("action-editor")
    );
  } finally {
    await db.user.update({
      where: { id: secondStaff.id },
      data: { isActive: true },
    });
  }
});
