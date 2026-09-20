import { expect, test } from "@playwright/test";
import {
  ACCOUNTS,
  captureScreenshot,
  cleanupE2EFixtures,
  getQueue,
  INITIAL_PASSWORD,
  requestJson,
  resetSeed,
  signInAndChangePassword,
  type QueueResponse,
  writeEvidence,
} from "./support";

const SEED_NEW_TICKET = "TKT-2026-SEED-01";

test.describe("release visual state evidence", () => {
  test.beforeEach(() => resetSeed());
  test.afterEach(() => cleanupE2EFixtures());

  test("captures invalid, inactive, busy-login, and logout states", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill(ACCOUNTS.requester.email);
    await page.locator("#login-password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByTestId("login-error")).toContainText(
      "Email or password is incorrect"
    );
    await captureScreenshot(
      page,
      "release-evidence",
      "authentication-invalid.png"
    );

    await page.goto("/login");
    await page.locator("#login-email").fill("noppadol.kaeo@example.com");
    await page.locator("#login-password").fill(INITIAL_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByTestId("login-error")).toContainText(
      "Email or password is incorrect"
    );
    await captureScreenshot(
      page,
      "release-evidence",
      "authentication-inactive.png"
    );

    let releaseBusyLogin: (() => Promise<void>) | undefined;
    await page.route("**/api/auth/login", async (route) => {
      await new Promise<void>((resolve) => {
        releaseBusyLogin = async () => {
          await route.fulfill({
            body: JSON.stringify({
              error: {
                code: "INVALID_CREDENTIALS",
                message: "Email or password is incorrect",
              },
            }),
            contentType: "application/json",
            status: 401,
          });
          resolve();
        };
      });
    });
    await page.goto("/login");
    await page.locator("#login-email").fill(ACCOUNTS.requester.email);
    await page.locator("#login-password").fill(INITIAL_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(
      page.getByRole("button", { name: "Signing in..." })
    ).toBeVisible();
    await captureScreenshot(
      page,
      "release-evidence",
      "authentication-busy-login.png"
    );
    await releaseBusyLogin?.();
    await expect(page.getByTestId("login-error")).toBeVisible();
    await page.unroute("**/api/auth/login");

    await signInAndChangePassword(
      page,
      ACCOUNTS.requester,
      "E2E.Visual.Auth!2026"
    );
    await page.getByTestId("logout-btn").click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId("login-card")).toBeVisible();
    await captureScreenshot(
      page,
      "release-evidence",
      "authentication-logout.png"
    );
  });

  test("captures queue loading, empty, error, feedback, and clipping states", async ({
    page,
  }) => {
    await signInAndChangePassword(
      page,
      ACCOUNTS.staff,
      "E2E.Visual.Queue!2026"
    );
    const queueResponse = await requestJson<QueueResponse>(
      page,
      "/api/staff/tickets?sort=updatedAt&order=desc&page=1&pageSize=10"
    );
    expect(queueResponse.status).toBe(200);

    let releaseQueueLoading: (() => void) | undefined;
    const queueLoading = new Promise<void>((resolve) => {
      releaseQueueLoading = resolve;
    });
    await page.route("**/api/staff/tickets*", async (route) => {
      await queueLoading;
      await route.fulfill({
        body: JSON.stringify(queueResponse.body),
        contentType: "application/json",
        status: 200,
      });
    });
    await page.goto("/staff/queue");
    await expect(page.getByTestId("queue-loading")).toBeVisible();
    await captureScreenshot(page, "release-evidence", "queue-loading.png");
    releaseQueueLoading?.();
    await expect(page.getByTestId("queue-table")).toBeVisible();
    await page.unroute("**/api/staff/tickets*");

    await page.route("**/api/staff/tickets*", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          page: 1,
          pageSize: 10,
          tickets: [],
          total: 0,
          totalPages: 0,
        }),
        contentType: "application/json",
        status: 200,
      });
    });
    await page.reload();
    await expect(page.getByTestId("queue-empty")).toBeVisible();
    await captureScreenshot(page, "release-evidence", "queue-empty.png");
    await page.unroute("**/api/staff/tickets*");

    await page.route("**/api/staff/tickets*", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "The ticket queue is temporarily unavailable.",
          },
        }),
        contentType: "application/json",
        status: 503,
      });
    });
    await page.reload();
    await expect(page.getByTestId("queue-failure")).toContainText(
      "temporarily unavailable"
    );
    await captureScreenshot(page, "release-evidence", "queue-error.png");
    await page.unroute("**/api/staff/tickets*");

    await page.reload();
    await expect(page.getByTestId("queue-table")).toBeVisible();
    await page.locator("#queue-search").fill("NO-MATCH-VISUAL-EVIDENCE");
    await expect(page.getByTestId("queue-no-results")).toBeVisible();
    await captureScreenshot(page, "release-evidence", "queue-feedback.png");
    await page.locator("#queue-search").fill("");
    await expect(page.getByTestId("queue-table")).toBeVisible();

    const clippingEvidence = await page
      .getByTestId("queue-table")
      .evaluate((element) => {
        const container = element as HTMLElement;
        const updatedHeader = Array.from(element.querySelectorAll("th")).find(
          (header) => header.textContent?.trim() === "Updated"
        );
        const bounds = updatedHeader?.getBoundingClientRect();
        const containerBounds = container.getBoundingClientRect();
        return {
          containerRight: containerBounds.right,
          documentScrollWidth: document.documentElement.scrollWidth,
          headerRight: bounds?.right ?? 0,
          headerText: updatedHeader?.textContent?.trim() ?? "",
          headerWidth: bounds?.width ?? 0,
          tableClientWidth: container.clientWidth,
          tableScrollWidth: container.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      });
    expect(clippingEvidence.headerText).toBe("Updated");
    expect(clippingEvidence.headerWidth).toBeGreaterThan(0);
    expect(clippingEvidence.headerRight).toBeLessThanOrEqual(
      clippingEvidence.containerRight + 1
    );
    expect(clippingEvidence.documentScrollWidth).toBeLessThanOrEqual(
      clippingEvidence.viewportWidth + 1
    );
    await captureScreenshot(
      page,
      "release-evidence",
      "queue-desktop-updated-column.png"
    );
    writeEvidence("visual-state-evidence.json", {
      queueDesktopUpdatedColumn: clippingEvidence,
      capturedBy: "e2e/lab-03/zz-release-evidence.spec.ts",
    });
  });

  test("captures staff-detail post-action and validation states", async ({
    page,
  }) => {
    await signInAndChangePassword(
      page,
      ACCOUNTS.staff,
      "E2E.Visual.Detail!2026"
    );
    await page.goto("/staff/queue");
    await expect(page.getByTestId("queue-table")).toBeVisible();
    await page.locator("#queue-search").fill(SEED_NEW_TICKET);
    const row = page.getByTestId("queue-row").filter({
      hasText: SEED_NEW_TICKET,
    });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Open" }).click();
    await expect(page.getByTestId("staff-detail-view")).toBeVisible();

    await page.getByTestId("claim-btn").click();
    await expect(page.getByTestId("owner-success")).toBeVisible();
    await page.getByTestId("priority-select").selectOption("MEDIUM");
    await expect(page.getByTestId("priority-success")).toBeVisible();
    await page.getByTestId("status-select").selectOption("IN_PROGRESS");
    await page.getByTestId("status-save-btn").click();
    await expect(page.getByTestId("status-success")).toBeVisible();
    await captureScreenshot(
      page,
      "release-evidence",
      "staff-detail-post-action.png"
    );

    await page.getByTestId("status-select").selectOption("RESOLVED");
    await page.getByTestId("resolution-summary-input").fill("");
    await page.getByTestId("status-save-btn").click();
    await expect(page.getByTestId("status-validation-error")).toBeVisible();
    await captureScreenshot(
      page,
      "release-evidence",
      "staff-detail-validation.png"
    );
  });

  test("captures clean User Management, dialogs, and safety guards", async ({
    page,
  }) => {
    await signInAndChangePassword(
      page,
      ACCOUNTS.admin,
      "E2E.Visual.Admin!2026"
    );
    await expect(page.getByTestId("user-management-view")).toBeVisible();
    const userRows = page.getByTestId(/user-row-/);
    await expect(userRows).toHaveCount(11);
    const userTableText = await page.getByTestId("users-table").innerText();
    expect(userTableText).not.toContain("e2e.");
    await captureScreenshot(
      page,
      "release-evidence",
      "admin-user-management-clean.png"
    );

    await page.getByTestId("create-user-btn").click();
    await expect(page.getByTestId("create-user-dialog")).toBeVisible();
    await captureScreenshot(
      page,
      "release-evidence",
      "admin-create-dialog.png"
    );
    await page.locator("#user-name").fill("Visual Evidence User");
    await page.locator("#user-email").fill("visual.evidence@example.com");
    await page.locator("#user-password").fill("short");
    await page
      .getByTestId("create-user-dialog")
      .getByRole("button", { name: "Create user" })
      .click();
    await expect(page.locator("#user-password-error")).toBeVisible();
    await captureScreenshot(
      page,
      "release-evidence",
      "admin-create-validation.png"
    );
    await page.getByRole("button", { name: "Close dialog" }).click();

    const staffRow = page.getByTestId(/user-row-/).filter({
      hasText: ACCOUNTS.staff.email,
    });
    await staffRow
      .getByRole("button", { name: `Edit ${ACCOUNTS.staff.name}` })
      .click();
    await expect(page.getByTestId("edit-user-dialog")).toBeVisible();
    await captureScreenshot(page, "release-evidence", "admin-edit-dialog.png");
    await page.getByRole("button", { name: "Close dialog" }).click();

    await staffRow
      .getByRole("button", {
        name: `Reset password for ${ACCOUNTS.staff.name}`,
      })
      .click();
    await expect(page.getByTestId("reset-user-dialog")).toBeVisible();
    await captureScreenshot(page, "release-evidence", "admin-reset-dialog.png");
    await page.locator("#user-password").fill("short");
    await page
      .getByTestId("reset-user-dialog")
      .getByRole("button", { name: "Reset password" })
      .click();
    await expect(page.locator("#user-password-error")).toBeVisible();
    await captureScreenshot(
      page,
      "release-evidence",
      "admin-reset-validation.png"
    );
    await page.getByRole("button", { name: "Close dialog" }).click();

    const adminRow = page.getByTestId(/user-row-/).filter({
      hasText: ACCOUNTS.admin.email,
    });
    await adminRow
      .getByRole("button", { name: `Edit ${ACCOUNTS.admin.name}` })
      .click();
    await page.locator("#user-active").uncheck();
    await page
      .getByTestId("edit-user-dialog")
      .getByRole("button", { name: "Save changes" })
      .click();
    await expect(page.getByTestId("deactivation-confirmation")).toBeVisible();
    await captureScreenshot(
      page,
      "release-evidence",
      "admin-safety-guard-confirmation.png"
    );
    await page
      .getByTestId("deactivation-confirmation")
      .getByRole("button", { name: "Confirm change" })
      .click();
    await expect(page.getByTestId("user-dialog-error")).toContainText(
      "cannot deactivate your own account"
    );
    await captureScreenshot(
      page,
      "release-evidence",
      "admin-safety-guard-error.png"
    );
    writeEvidence("clean-user-management.json", {
      rowCount: await userRows.count(),
      containsE2EUsers: userTableText.includes("e2e."),
      capturedBy: "e2e/lab-03/zz-release-evidence.spec.ts",
    });
  });
});
