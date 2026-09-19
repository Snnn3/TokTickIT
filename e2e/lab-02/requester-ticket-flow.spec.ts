import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  ACCOUNTS,
  cleanupE2EFixtures,
  resetSeed,
  signInAndChangePassword,
} from "../lab-03/support";

const E2E_PASSWORD = "E2E.Lab2!2026";
const SCREENSHOT_ROOT = join(
  process.cwd(),
  "artifacts",
  "lab-03",
  "screenshots",
  "requester-regression"
);
const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 667 },
] as const;

type UploadFixture = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

async function createTicket(
  page: Page,
  summary: string,
  description: string,
  attachment?: UploadFixture
): Promise<string> {
  await page.goto("/tickets/new");
  await expect(page.getByTestId("create-ticket-form")).toBeVisible();
  await page
    .locator("#category-select")
    .selectOption({ label: "Account and Access" });
  await page.locator("#system-select").selectOption({ label: "Email" });
  await page.locator("#priority-select").selectOption("MEDIUM");
  await page.locator("#summary-input").fill(summary);
  await page.locator("#description-input").fill(description);

  if (attachment) {
    await page.locator("#file-upload-input").setInputFiles(attachment);
    await expect(page.getByText(attachment.name)).toBeVisible();
  }

  await page.getByRole("button", { name: "Submit Ticket" }).click();
  const successPanel = page.getByTestId("success-panel");
  await expect(successPanel).toBeVisible();

  const ticketNumber = (
    await successPanel.getByTestId("success-ticket-number").innerText()
  ).trim();
  expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);
  return ticketNumber;
}

async function openTicket(page: Page, ticketNumber: string): Promise<void> {
  await page.goto("/tickets");
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await page.locator("#ticket-search").fill(ticketNumber);
  const ticketButton = page
    .getByTestId("tickets-desktop-table")
    .getByRole("button", { name: ticketNumber });
  await expect(ticketButton).toBeVisible();
  await ticketButton.click();
  await expect(page.getByTestId("ticket-detail-view")).toBeVisible();
}

async function captureResponsive(
  page: Page,
  screenName: string
): Promise<void> {
  const destination = join(SCREENSHOT_ROOT, screenName);
  mkdirSync(destination, { recursive: true });

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 1);
    await page.screenshot({
      fullPage: true,
      path: join(destination, `${viewport.name}.png`),
    });
  }
}

test.describe("Lab 2 requester regression under session authentication", () => {
  test.beforeEach(() => resetSeed());
  test.afterEach(() => cleanupE2EFixtures());

  test("E-01: authenticated requester creates and finds a ticket", async ({
    page,
  }) => {
    await signInAndChangePassword(page, ACCOUNTS.requester, E2E_PASSWORD);

    const summary = `E2E Lab2 happy path ${Date.now()}`;
    const ticketNumber = await createTicket(
      page,
      summary,
      "This is an authenticated Lab 2 requester regression ticket.",
      {
        name: "e2e-attachment.png",
        mimeType: "image/png",
        buffer: Buffer.from("fake-png-content-for-e2e-test"),
      }
    );

    await page.getByRole("button", { name: "View My Tickets" }).click();
    await expect(
      page.getByRole("heading", { name: "My Tickets" })
    ).toBeVisible();
    await expect(
      page.getByTestId("tickets-desktop-table").getByText(summary)
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: ticketNumber })
    ).toBeVisible();
  });

  test("E-02: requester isolation and attachment lifecycle", async ({
    browser,
    page,
  }) => {
    await signInAndChangePassword(page, ACCOUNTS.requester, E2E_PASSWORD);

    const summary = `E2E Lab2 isolation ${Date.now()}`;
    const ticketNumber = await createTicket(
      page,
      summary,
      "Verify ownership and attachment lifecycle under session authentication.",
      {
        name: "report.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("pdf-sample-e2e-payload"),
      }
    );

    const secondContext = await browser.newContext({
      baseURL: "http://localhost:5173",
    });
    const secondPage = await secondContext.newPage();

    try {
      await signInAndChangePassword(
        secondPage,
        ACCOUNTS.secondRequester,
        E2E_PASSWORD
      );
      await secondPage.locator("#ticket-search").fill(ticketNumber);
      await expect(secondPage.getByTestId("no-results-state")).toBeVisible();
      await expect(secondPage.getByText(ticketNumber)).toHaveCount(0);
    } finally {
      await secondContext.close();
    }

    await openTicket(page, ticketNumber);
    await expect(page.locator(".zg-readonly-panel").first()).toBeVisible();

    await page.getByTestId("add-attachment-input").setInputFiles({
      name: "evidence.png",
      mimeType: "image/png",
      buffer: Buffer.from("png-evidence-attachment"),
    });
    await expect(page.getByText("evidence.png")).toBeVisible();
    await expect(page.getByTestId(/^attachment-row-/)).toHaveCount(2);

    await page.getByTestId("add-attachment-input").setInputFiles({
      name: "virus.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("malicious-exe"),
    });
    await expect(page.getByTestId("staged-error-message")).toContainText(
      /unsupported format/i
    );
    await page.getByRole("button", { name: /Dismiss/i }).click();

    const activeRow = page.getByTestId(/^attachment-row-/).first();
    const activeRowTestId = await activeRow.getAttribute("data-testid");
    const activeAttachmentId = activeRowTestId?.replace("attachment-row-", "");
    if (!activeAttachmentId) {
      throw new Error("The uploaded attachment row did not expose an id.");
    }

    const activeDownloadStatus = await page.evaluate(async (attachmentId) => {
      const response = await fetch(`/api/attachments/${attachmentId}/download`);
      return response.status;
    }, activeAttachmentId);
    expect(activeDownloadStatus).toBe(200);

    await page
      .getByTestId(/^remove-button-/)
      .first()
      .click();
    const removeDialog = page.getByTestId("remove-attachment-dialog");
    await expect(removeDialog).toBeVisible();

    const confirmRemoveButton = page.getByTestId("confirm-remove-button");
    await expect(confirmRemoveButton).toBeDisabled();
    await page
      .locator("#removal-reason-input")
      .fill("Uploaded by mistake, replacing with an updated version.");
    await expect(confirmRemoveButton).toBeEnabled();
    await confirmRemoveButton.click();

    await expect(removeDialog).not.toBeVisible();
    await expect(page.getByTestId(/^removed-badge-/).first()).toBeVisible();
    await expect(page.getByTestId(/^removed-reason-/).first()).toContainText(
      "Uploaded by mistake"
    );

    const removedBadgeTestId = await page
      .getByTestId(/^removed-badge-/)
      .first()
      .getAttribute("data-testid");
    const removedAttachmentId = removedBadgeTestId?.replace(
      "removed-badge-",
      ""
    );
    if (!removedAttachmentId) {
      throw new Error("The removed attachment badge did not expose an id.");
    }

    const removedDownloadStatus = await page.evaluate(async (attachmentId) => {
      const response = await fetch(`/api/attachments/${attachmentId}/download`);
      return response.status;
    }, removedAttachmentId);
    expect(removedDownloadStatus).toBe(410);
  });

  test("R-01 & E-03: requester responsive layouts and screenshots", async ({
    page,
  }) => {
    await signInAndChangePassword(page, ACCOUNTS.requester, E2E_PASSWORD);

    await page.goto("/tickets");
    await expect(page.getByTestId("tickets-desktop-table")).toBeVisible();
    await captureResponsive(page, "my-tickets");

    await page.goto("/tickets/new");
    await expect(page.getByTestId("create-ticket-form")).toBeVisible();
    await captureResponsive(page, "create-ticket");

    const summary = `E2E Lab2 responsive detail ${Date.now()}`;
    const ticketNumber = await createTicket(
      page,
      summary,
      "Detail view responsive verification."
    );
    await page.getByRole("button", { name: "View My Tickets" }).click();
    await page.setViewportSize({ width: 1366, height: 768 });
    await openTicket(page, ticketNumber);
    await captureResponsive(page, "ticket-detail");
  });
});
