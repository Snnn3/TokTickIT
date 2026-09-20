import { expect, test } from "@playwright/test";
import {
  ACCOUNTS,
  assertNoHorizontalOverflow,
  captureScreenshot,
  cleanupE2EFixtures,
  requestJson,
  resetSeed,
  signInAndChangePassword,
  VIEWPORTS,
} from "./support";

test.describe("E-03 user administration journey", () => {
  test.beforeEach(() => resetSeed());
  test.afterEach(() => cleanupE2EFixtures());

  test("search, create, edit, reset, role guard, and deactivation cascade", async ({
    browser,
    page: adminPage,
  }) => {
    await signInAndChangePassword(adminPage, ACCOUNTS.admin, "E2E.Admin!2026");
    await expect(adminPage.getByTestId("user-management-view")).toBeVisible();

    await adminPage.getByLabel("Search name or email").fill("kittipong");
    const staffRow = adminPage.getByTestId(/user-row-/).filter({
      hasText: "kittipong.saelim@example.com",
    });
    await expect(staffRow).toBeVisible();
    await adminPage.getByLabel("Filter by role").selectOption("IT_STAFF");
    await expect(staffRow).toBeVisible();
    await adminPage.getByLabel("Filter by role").selectOption("");

    const createdEmail = `e2e.user.${Date.now()}@example.com`;
    const createdName = "E2E Created User";
    const createdPassword = "E2E.Created!2026";
    await adminPage.getByTestId("create-user-btn").click();
    const createDialog = adminPage.getByTestId("create-user-dialog");
    await expect(createDialog).toBeVisible();
    await createDialog.locator("#user-name").fill(createdName);
    await createDialog.locator("#user-email").fill(createdEmail);
    await createDialog.locator("#user-role").selectOption("REQUESTER");
    await createDialog.locator("#user-password").fill(createdPassword);
    await expect(createDialog.locator("#user-name")).toHaveValue(createdName);
    await expect(createDialog.locator("#user-email")).toHaveValue(createdEmail);
    await expect(createDialog.locator("#user-password")).toHaveValue(
      createdPassword
    );
    await createDialog.getByRole("button", { name: "Create user" }).click();
    await expect(adminPage.getByTestId("users-success")).toContainText(
      "User created"
    );

    await adminPage.getByLabel("Search name or email").fill(createdEmail);
    const createdRow = adminPage.getByTestId(/user-row-/).filter({
      hasText: createdEmail,
    });
    await expect(createdRow).toBeVisible();

    const editedName = "E2E Updated User";
    await createdRow
      .getByRole("button", { name: `Edit ${createdName}` })
      .click();
    await adminPage.locator("#user-name").fill(editedName);
    await adminPage
      .getByTestId("edit-user-dialog")
      .getByRole("button", { name: "Save changes" })
      .click();
    await expect(adminPage.getByTestId("users-success")).toContainText(
      "User updated"
    );
    await adminPage.getByLabel("Search name or email").fill(createdEmail);
    const editedRow = adminPage.getByTestId(/user-row-/).filter({
      hasText: editedName,
    });
    await expect(editedRow).toBeVisible();

    const resetPassword = "E2E.Reset!2026";
    await editedRow
      .getByRole("button", { name: `Reset password for ${editedName}` })
      .click();
    await expect(adminPage.getByTestId("reset-user-dialog")).toBeVisible();
    await adminPage.locator("#user-password").fill(resetPassword);
    await adminPage
      .getByTestId("reset-user-dialog")
      .getByRole("button", { name: "Reset password" })
      .click();
    await expect(adminPage.getByTestId("users-success")).toContainText(
      "Password reset"
    );

    const resetContext = await browser.newContext({
      baseURL: "http://localhost:5173",
    });
    const resetPage = await resetContext.newPage();
    await resetPage.goto("/login");
    await resetPage.locator("#login-email").fill(createdEmail);
    await resetPage.locator("#login-password").fill(resetPassword);
    await resetPage.getByRole("button", { name: "Sign In" }).click();
    await expect(resetPage.getByTestId("change-password-card")).toBeVisible();
    await resetContext.close();

    const staffContext = await browser.newContext({
      baseURL: "http://localhost:5173",
    });
    const staffPage = await staffContext.newPage();
    await signInAndChangePassword(staffPage, ACCOUNTS.staff, "E2E.Staff!2026");

    await adminPage.getByLabel("Search name or email").fill("kittipong");
    const cascadeRow = adminPage.getByTestId(/user-row-/).filter({
      hasText: "kittipong.saelim@example.com",
    });
    await cascadeRow
      .getByRole("button", { name: "Edit Kittipong Saelim" })
      .click();
    await adminPage.locator("#user-active").uncheck();
    await adminPage
      .getByTestId("edit-user-dialog")
      .getByRole("button", { name: "Save changes" })
      .click();
    await expect(
      adminPage.getByTestId("deactivation-confirmation")
    ).toContainText("owns 1 open tickets");
    await adminPage
      .getByTestId("deactivation-confirmation")
      .getByRole("button", { name: "Confirm change" })
      .click();
    await expect(adminPage.getByTestId("users-success")).toContainText(
      "returned to the unassigned pool"
    );

    const invalidatedStaffSession = await requestJson(
      staffPage,
      "/api/auth/me"
    );
    expect(invalidatedStaffSession.status).toBe(401);
    const queueAfterCascade = await requestJson<{
      tickets: Array<{ number: string; owner: unknown }>;
    }>(
      adminPage,
      "/api/staff/tickets?search=TKT-2026-SEED-02&page=1&pageSize=20"
    );
    expect(queueAfterCascade.status).toBe(200);
    expect(queueAfterCascade.body.tickets[0]?.owner).toBeNull();

    const requesterContext = await browser.newContext({
      baseURL: "http://localhost:5173",
    });
    const requesterPage = await requesterContext.newPage();
    await signInAndChangePassword(
      requesterPage,
      ACCOUNTS.requester,
      "E2E.Requester!2026"
    );
    await requesterPage.goto("/admin/users");
    await expect(requesterPage.getByTestId("forbidden-panel")).toBeVisible();
    const adminGuard = await requestJson(requesterPage, "/api/admin/users");
    expect(adminGuard.status).toBe(403);

    await staffContext.close();
    await requesterContext.close();
  });

  test("captures user management at desktop, tablet, and mobile widths", async ({
    page,
  }) => {
    await signInAndChangePassword(page, ACCOUNTS.admin, "E2E.Admin!2026");
    for (const [viewportName, viewport] of Object.entries(VIEWPORTS) as [
      keyof typeof VIEWPORTS,
      (typeof VIEWPORTS)[keyof typeof VIEWPORTS],
    ][]) {
      await page.setViewportSize(viewport);
      await page.goto("/admin/users");
      await expect(page.getByTestId("user-management-view")).toBeVisible();
      await expect(page.getByTestId("users-table")).toBeVisible();
      await page.keyboard.press("Tab");
      await captureScreenshot(page, "user-management", `${viewportName}.png`);
      await assertNoHorizontalOverflow(page);
    }
  });
});
