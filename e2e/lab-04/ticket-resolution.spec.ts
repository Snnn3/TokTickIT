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

async function signIn(page: Page, account: "staff" | "requester") {
  await page.goto("/login");
  await page.locator("#login-email").fill(DASHBOARD_ACCOUNTS[account].email);
  await page.locator("#login-password").fill(DASHBOARD_PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByTestId("identity-chip")).toContainText(
    DASHBOARD_ACCOUNTS[account].name
  );
}

test("E4-02 resolution requires completed work; requester sees public evidence, reopens and signals advisory state", async ({
  browser,
}, testInfo) => {
  const staffContext = await browser.newContext();
  const requesterContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  const requesterPage = await requesterContext.newPage();
  try {
    await signIn(staffPage, "staff");
    await staffPage.goto(`/staff/tickets/${ticketId}`);
    await expect(staffPage.getByTestId("staff-detail-view")).toBeVisible();

    await staffPage
      .getByTestId("comment-composer")
      .fill("The requester can verify this fix.");
    await staffPage.getByTestId("comment-post-btn").click();
    await expect(staffPage.getByTestId("comment-list")).toContainText(
      "The requester can verify this fix."
    );
    await staffPage
      .getByTestId("note-composer")
      .fill("Internal diagnostic: adapter reset.");
    await staffPage.getByTestId("note-post-btn").click();
    await expect(staffPage.getByTestId("note-list")).toContainText(
      "Internal diagnostic: adapter reset."
    );

    const status = staffPage.getByLabel("New status");
    const summary = staffPage.getByTestId("resolution-summary-input");
    await status.selectOption("IN_PROGRESS");
    await staffPage.getByTestId("status-save-btn").click();
    await expect(staffPage.getByTestId("status-success")).toBeVisible();
    await status.selectOption("RESOLVED");
    await summary.fill("Verified the adapter connection.");
    await staffPage.getByTestId("status-save-btn").click();
    await expect(staffPage.getByTestId("status-error")).toContainText(
      "A completed Action with a meaningful result is required"
    );
    await captureEvidence(
      staffPage,
      testInfo,
      "ticket-workflow",
      "resolution-blocked-desktop",
      "E4-02",
      "IT_STAFF",
      "The server refuses resolution before completed work exists and leaves the Ticket open with a safe explanation.",
      staffPage.getByTestId("status-error")
    );

    await staffPage.getByTestId("action-add-btn").click();
    const editor = staffPage.getByTestId("action-editor");
    await editor.getByLabel("Action title").fill("Verify network recovery");
    await editor
      .getByLabel("Action description")
      .fill("Reconnect and test the VPN session.");
    await editor.getByRole("button", { name: "Save Action" }).click();
    const action = staffPage
      .getByTestId("action-item")
      .filter({ hasText: "Verify network recovery" });
    await expect(action).toBeVisible();
    await action
      .getByRole("button", { name: "Edit Verify network recovery" })
      .click();
    await editor.getByLabel("Action status").selectOption("IN_PROGRESS");
    await editor.getByRole("button", { name: "Save Action" }).click();
    await expect(action.getByTestId("action-status")).toHaveText("In Progress");
    await action
      .getByRole("button", { name: "Edit Verify network recovery" })
      .click();
    await editor.getByLabel("Action status").selectOption("COMPLETED");
    await editor
      .getByLabel("Action result")
      .fill("VPN reconnected and verified.");
    await editor.getByRole("button", { name: "Save Action" }).click();
    await expect(action.getByTestId("action-status")).toHaveText("Completed");

    await staffPage.getByTestId("status-save-btn").click();
    await expect(staffPage.getByTestId("status-success")).toBeVisible();
    let currentTicket = await db.ticket.findUniqueOrThrow({
      where: { id: ticketId },
    });
    expect(currentTicket.status).toBe("RESOLVED");
    expect(currentTicket.resolutionSummary).toBe(
      "Verified the adapter connection."
    );

    await staffPage.setViewportSize({ width: 1366, height: 900 });
    await captureEvidence(
      staffPage,
      testInfo,
      "ticket-workflow",
      "resolved-staff-desktop",
      "E4-02",
      "IT_STAFF",
      "The Staff detail shows the resolved Ticket and summary; the journey also verifies completed work and role-separated discussion.",
      staffPage.getByTestId("resolution-summary-input")
    );
    await staffPage.setViewportSize({ width: 768, height: 1024 });
    expect(
      await staffPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1
      )
    ).toBe(true);
    await captureEvidence(
      staffPage,
      testInfo,
      "ticket-workflow",
      "resolved-staff-tablet",
      "E4-02",
      "IT_STAFF",
      "Staff Ticket detail remains readable at tablet width without horizontal overflow.",
      staffPage.getByTestId("resolution-summary-input")
    );
    await staffPage.setViewportSize({ width: 375, height: 812 });
    expect(
      await staffPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1
      )
    ).toBe(true);
    await captureEvidence(
      staffPage,
      testInfo,
      "ticket-workflow",
      "resolved-staff-mobile",
      "E4-02",
      "IT_STAFF",
      "Staff Ticket detail remains readable at mobile width without horizontal overflow.",
      staffPage.getByTestId("resolution-summary-input")
    );

    await signIn(requesterPage, "requester");
    await requesterPage.goto(`/tickets/${ticketId}`);
    await expect(requesterPage.getByTestId("ticket-detail-view")).toBeVisible();
    await expect(
      requesterPage.getByTestId("resolution-summary-panel")
    ).toContainText("Verified the adapter connection.");
    await expect(requesterPage.getByTestId("comment-list")).toContainText(
      "The requester can verify this fix."
    );
    await expect(
      requesterPage.getByText("Internal diagnostic: adapter reset.")
    ).toHaveCount(0);
    await expect(requesterPage.getByTestId("internal-notes")).toHaveCount(0);
    await expect(requesterPage.getByTestId("reopen-btn")).toBeVisible();
    await captureEvidence(
      requesterPage,
      testInfo,
      "ticket-workflow",
      "resolved-requester-desktop",
      "E4-02",
      "REQUESTER",
      "The requester sees the read-only resolution summary; the journey verifies public comments and hides staff-only notes.",
      requesterPage.getByTestId("resolution-summary-panel")
    );

    await requesterPage.getByTestId("reopen-btn").click();
    await expect(requesterPage.getByTestId("reopen-confirm")).toBeVisible();
    await requesterPage.getByTestId("reopen-confirm-btn").click();
    await expect(requesterPage.getByTestId("reopen-success")).toBeVisible();
    currentTicket = await db.ticket.findUniqueOrThrow({
      where: { id: ticketId },
    });
    expect(currentTicket.status).toBe("REOPENED");
    expect(currentTicket.resolvedAt).toBeNull();

    await requesterPage.getByTestId("appears-resolved-btn").click();
    await requesterPage.getByTestId("appears-resolved-confirm-btn").click();
    await expect(
      requesterPage.getByTestId("appears-resolved-success")
    ).toBeVisible();
    currentTicket = await db.ticket.findUniqueOrThrow({
      where: { id: ticketId },
    });
    expect(currentTicket.status).toBe("REOPENED");
    expect(currentTicket.appearsResolvedAt).not.toBeNull();

    await requesterPage.setViewportSize({ width: 375, height: 812 });
    expect(
      await requesterPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1
      )
    ).toBe(true);
    await captureEvidence(
      requesterPage,
      testInfo,
      "ticket-workflow",
      "requester-reopened-mobile",
      "E4-02",
      "REQUESTER",
      "Requester can reopen the resolved Ticket and record an advisory appears-resolved signal without changing workflow status.",
      requesterPage.getByTestId("appears-resolved-success")
    );
  } finally {
    await requesterContext.close();
    await staffContext.close();
  }
});
