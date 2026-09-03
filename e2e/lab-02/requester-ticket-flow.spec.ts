import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const ANUCHA_ID = "1";
const ANUCHA_LABEL = "Anucha Wongchai (anucha.wongchai@example.com)";
const BUSABA_LABEL = "Busaba Srisawat (busaba.srisawat@example.com)";

interface ViewportConfig {
  name: string;
  width: number;
  height: number;
}

const VIEWPORTS: ViewportConfig[] = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 667 },
];

/**
 * Reusable helper to assert zero horizontal scrolling (scrollWidth <= innerWidth)
 * and capture full-page screenshot evidence across designated responsive viewports.
 */
async function assertNoHorizontalScrollAndCapture(
  page: Page,
  screenName: "create-ticket" | "my-tickets" | "ticket-detail",
  screenshotsBase: string,
  viewports: ViewportConfig[] = VIEWPORTS,
) {
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBe(false);

    const shotPath = path.join(screenshotsBase, screenName, `${vp.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    expect(fs.existsSync(shotPath)).toBe(true);
  }
}

test.describe("Lab 2 Requester E2E & Visual Testing Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root to land on Requester Selection screen
    await page.goto("/");
  });

  test("E-01: Selector -> Create Ticket Happy Path with Keyboard Usability (AC-01, AC-24, FR-01..FR-07)", async ({
    page,
  }) => {
    // 1. Requester Selection screen renders [FR-01, BR-03]
    await expect(page.getByRole("heading", { name: "TokTickIT", level: 1 })).toBeVisible();
    await expect(
      page.getByText("Select a Development Requester to test requester-specific ticket behavior"),
    ).toBeVisible();

    const selectDropdown = page.locator("#requester-select");
    const continueBtn = page.getByRole("button", { name: "Continue" });

    // Verify continue button is disabled when unselected
    await expect(continueBtn).toBeDisabled();

    // Keyboard-usable selection & navigation [AC-24, ui-spec §6]
    await selectDropdown.focus();
    await expect(selectDropdown).toBeFocused();
    await selectDropdown.selectOption({ label: ANUCHA_LABEL });
    await expect(continueBtn).toBeEnabled();

    // Submit selection via Enter key navigation
    await page.keyboard.press("Tab");
    await expect(continueBtn).toBeFocused();
    await page.keyboard.press("Enter");

    // Lands on App Shell in My Tickets -> navigate to Create Ticket tab
    await page.getByRole("button", { name: "Create Ticket" }).first().click();

    // 2. Lands on App Shell in Create Ticket tab [FR-04, BR-08, BR-10]
    await expect(page.getByRole("heading", { name: "Create Support Ticket", level: 1 })).toBeVisible();
    await expect(page.locator("#sys-requester")).toHaveValue(/Anucha Wongchai/);

    // 3. Fill ticket details with keyboard & select controls
    await page.locator("#category-select").selectOption({ index: 1 });
    await page.locator("#system-select").selectOption({ index: 1 });
    await page.locator("#priority-select").selectOption("MEDIUM");

    const uniqueSummary = `E2E Happy Path Ticket - ${Date.now()}`;
    await page.locator("#summary-input").fill(uniqueSummary);
    await page.locator("#description-input").fill("This is an end-to-end automated test ticket description.");

    // Stage a valid file attachment [FR-06, BR-13]
    const filePayload = {
      name: "e2e-attachment.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-png-content-for-e2e-test"),
    };
    await page.locator("#file-upload-input").setInputFiles(filePayload);
    await expect(page.getByText("e2e-attachment.png")).toBeVisible();

    // Submit ticket
    const submitBtn = page.getByRole("button", { name: "Submit Ticket" });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 4. Success panel renders with official ticket number [AC-01, FR-07, BR-01]
    const successPanel = page.getByTestId("success-panel");
    await expect(successPanel).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ticket Created Successfully!" })).toBeVisible();

    const ticketNumber = await successPanel.locator("div.h3.fw-bold").innerText();
    expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);

    // 5. Navigate to My Tickets and verify ticket is located [FR-08, AC-02]
    await page.getByRole("button", { name: "View My Tickets" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets", level: 1 })).toBeVisible();

    // Find ticket row
    await expect(page.getByText(uniqueSummary).first()).toBeVisible();
    await expect(page.getByText(ticketNumber).first()).toBeVisible();
  });

  test("E-02: Multi-Requester Isolation & Attachment Lifecycle (AC-03, AC-11, AC-12, AC-18, BR-04..BR-06)", async ({
    page,
    request,
  }) => {
    // --- Step 1: Requester A (Anucha) logs in and creates a ticket with attachment ---
    await page.locator("#requester-select").selectOption({ label: ANUCHA_LABEL });
    await page.getByRole("button", { name: "Continue" }).click();

    // Navigate to Create Ticket
    await page.getByRole("button", { name: "Create Ticket" }).first().click();
    await expect(page.getByRole("heading", { name: "Create Support Ticket", level: 1 })).toBeVisible();

    const isolationSummary = `Isolation & Attachment Lifecycle - ${Date.now()}`;
    await page.locator("#category-select").selectOption({ index: 1 });
    await page.locator("#system-select").selectOption({ index: 1 });
    await page.locator("#priority-select").selectOption("HIGH");
    await page.locator("#summary-input").fill(isolationSummary);
    await page.locator("#description-input").fill("Testing multi-requester data isolation and attachment soft-removal.");

    await page.locator("#file-upload-input").setInputFiles({
      name: "report.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("pdf-sample-e2e-payload"),
    });

    await page.getByRole("button", { name: "Submit Ticket" }).click();
    const successPanel = page.getByTestId("success-panel");
    await expect(successPanel).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ticket Created Successfully!" })).toBeVisible();

    const ticketNumber = await successPanel.locator("div.h3.fw-bold").innerText();
    expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);

    // --- Step 2: Switch to Requester B (Busaba) and assert data isolation [AC-18, BR-04] ---
    await page.getByRole("button", { name: "Change Requester" }).click();
    await expect(page.locator("#requester-select")).toBeVisible();

    await page.locator("#requester-select").selectOption({ label: BUSABA_LABEL });
    await page.getByRole("button", { name: "Continue" }).click();

    // Lands on My Tickets
    await expect(page.getByRole("heading", { name: "My Tickets", level: 1 })).toBeVisible();

    // Verify Requester B CANNOT see Requester A's ticket
    await expect(page.getByText(isolationSummary)).toHaveCount(0);
    await expect(page.getByText(ticketNumber)).toHaveCount(0);

    // --- Step 3: Switch back to Requester A and open Ticket Detail ---
    await page.getByRole("button", { name: "Change Requester" }).click();
    await page.locator("#requester-select").selectOption({ label: ANUCHA_LABEL });
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "My Tickets", level: 1 })).toBeVisible();
    await expect(page.getByText(isolationSummary).first()).toBeVisible();

    // Click on ticket to view Detail
    await page.getByRole("button", { name: ticketNumber }).first().click();
    await expect(page.getByTestId("ticket-detail-view")).toBeVisible();
    await expect(page.getByText(ticketNumber).first()).toBeVisible();

    // Verify read-only shaded groups [AC-23]
    await expect(page.locator(".zg-readonly-panel").first()).toBeVisible();

    // --- Step 4: Add another attachment directly on Ticket Detail [AC-09, AC-10] ---
    await page.getByTestId("add-attachment-input").setInputFiles({
      name: "evidence.png",
      mimeType: "image/png",
      buffer: Buffer.from("png-evidence-attachment"),
    });

    await expect(page.getByText("evidence.png")).toBeVisible();

    // Test staged invalid file pre-check & dismiss [AC-07, AC-08]
    await page.getByTestId("add-attachment-input").setInputFiles({
      name: "virus.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("malicious-exe"),
    });

    await expect(page.getByText(/unsupported format/i)).toBeVisible();
    await page.getByRole("button", { name: /Dismiss/i }).click();
    await expect(page.getByText(/unsupported format/i)).not.toBeVisible();

    // Extract active attachment ID from testid
    const activeRow = page.getByTestId(/^attachment-row-/).first();
    const activeRowTestId = await activeRow.getAttribute("data-testid");
    const activeAttachmentId = activeRowTestId?.replace("attachment-row-", "");

    // Verify active attachment download is accessible [FR-11, AC-11]
    const activeDownloadRes = await request.get(`/api/attachments/${activeAttachmentId}/download`, {
      headers: {
        "X-Requester-Id": ANUCHA_ID,
      },
    });
    expect(activeDownloadRes.status()).toBe(200);

    // --- Step 5: Soft-remove an attachment with mandatory reason [AC-11, AC-12, BR-17] ---
    const removeBtn = page.getByTestId(/^remove-button-/).first();
    await removeBtn.click();

    // Removal Modal is open
    const modal = page.getByTestId("remove-attachment-dialog");
    await expect(modal).toBeVisible();

    const confirmRemoveBtn = page.getByTestId("confirm-remove-button");
    await expect(confirmRemoveBtn).toBeDisabled(); // Disabled on empty reason

    // Fill valid reason
    const reasonTextarea = page.locator("#removal-reason-input");
    await reasonTextarea.fill("Uploaded by mistake, replacing with updated version.");
    await expect(confirmRemoveBtn).toBeEnabled();

    // Submit removal
    await confirmRemoveBtn.click();
    await expect(modal).not.toBeVisible();

    // Assert removed row rendering: strikethrough, Removed badge, audit caption
    await expect(page.getByTestId(/^removed-badge-/).first()).toBeVisible();
    await expect(page.getByTestId(/^removed-reason-/).first()).toContainText("Uploaded by mistake");

    // Extract removed attachment ID from testid
    const removedBadge = page.getByTestId(/^removed-badge-/).first();
    const testIdAttr = await removedBadge.getAttribute("data-testid");
    const removedAttachmentId = testIdAttr?.replace("removed-badge-", "");

    // Verify download byte streaming is blocked with HTTP 410 [AC-11, BR-16]
    const downloadRes = await request.get(`/api/attachments/${removedAttachmentId}/download`, {
      headers: {
        "X-Requester-Id": ANUCHA_ID,
      },
    });
    expect(downloadRes.status()).toBe(410);
  });

  test("R-01 & E-03: Responsive Layouts (No Horizontal Scroll) and Visual Screenshot Evidence (AC-22, ui-spec §11)", async ({
    page,
  }) => {
    // 1. Select Requester
    await page.locator("#requester-select").selectOption({ label: ANUCHA_LABEL });
    await page.getByRole("button", { name: "Continue" }).click();

    const screenshotsBase = path.join(process.cwd(), "artifacts", "lab-02", "screenshots");
    fs.mkdirSync(path.join(screenshotsBase, "create-ticket"), { recursive: true });
    fs.mkdirSync(path.join(screenshotsBase, "my-tickets"), { recursive: true });
    fs.mkdirSync(path.join(screenshotsBase, "ticket-detail"), { recursive: true });

    // --- Screen 1: My Tickets ---
    await expect(page.getByRole("heading", { name: "My Tickets", level: 1 })).toBeVisible();

    // Assert responsive layout DOM element switching [AC-22, ui-spec §8]
    await page.setViewportSize({ width: 1366, height: 768 });
    await expect(page.getByTestId("tickets-desktop-table")).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByTestId("tickets-mobile-cards")).toBeVisible();

    await assertNoHorizontalScrollAndCapture(page, "my-tickets", screenshotsBase);

    // --- Screen 2: Create Ticket ---
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.getByRole("button", { name: "Create Ticket" }).first().click();
    await expect(page.getByRole("heading", { name: "Create Support Ticket", level: 1 })).toBeVisible();

    await assertNoHorizontalScrollAndCapture(page, "create-ticket", screenshotsBase);

    // --- Screen 3: Ticket Detail ---
    // Create a ticket first to guarantee at least 1 ticket exists for Detail view capture
    await page.locator("#category-select").selectOption({ index: 1 });
    await page.locator("#system-select").selectOption({ index: 1 });
    await page.locator("#priority-select").selectOption("MEDIUM");
    const visualEvidenceSummary = `Visual Evidence Ticket - ${Date.now()}`;
    await page.locator("#summary-input").fill(visualEvidenceSummary);
    await page.locator("#description-input").fill("Detail view layout responsive verification.");
    await page.getByRole("button", { name: "Submit Ticket" }).click();

    await expect(page.getByTestId("success-panel")).toBeVisible();
    await page.getByRole("button", { name: "View My Tickets" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets", level: 1 })).toBeVisible();

    // Ensure desktop viewport before clicking table row
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.getByRole("button", { name: "View" }).first().click();
    await expect(page.getByTestId("ticket-detail-view")).toBeVisible();

    await assertNoHorizontalScrollAndCapture(page, "ticket-detail", screenshotsBase);
  });
});
