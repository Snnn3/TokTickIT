import { expect, test } from "@playwright/test";
import {
  ACCOUNTS,
  assertNoHorizontalOverflow,
  captureScreenshot,
  cleanupE2EFixtures,
  resetSeed,
  signInAndChangePassword,
  VIEWPORTS,
} from "./support";

test.describe("E-01 authentication journey", () => {
  test.beforeEach(() => resetSeed());
  test.afterEach(() => cleanupE2EFixtures());

  test("first sign-in, forced password change, logout, and cookie replay", async ({
    browser,
    page,
  }) => {
    const changedPassword = "E2E.Auth!2026";

    await page.goto("/login");
    await page.locator("#login-email").fill(ACCOUNTS.requester.email);
    await page.locator("#login-password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByTestId("login-error")).toContainText(
      "Email or password is incorrect"
    );

    await signInAndChangePassword(page, ACCOUNTS.requester, changedPassword);
    await expect(page).toHaveURL(/\/tickets$/);

    const sessionBeforeLogout = await page.context().cookies();
    await page.getByTestId("logout-btn").click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId("login-card")).toBeVisible();

    const replayContext = await browser.newContext({
      baseURL: "http://localhost:5173",
    });
    await replayContext.addCookies(sessionBeforeLogout);
    const replayPage = await replayContext.newPage();
    await replayPage.goto("/tickets");
    await expect(replayPage).toHaveURL(/\/login$/);
    await expect(replayPage.getByTestId("login-card")).toBeVisible();
    await replayContext.close();
  });

  test("captures authentication screens at desktop, tablet, and mobile widths", async ({
    browser,
  }) => {
    const accounts = [
      ACCOUNTS.requester,
      ACCOUNTS.secondRequester,
      ACCOUNTS.thirdRequester,
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
      await page.goto("/login");
      await page.keyboard.press("Tab");
      await captureScreenshot(page, "authentication", `${viewportName}.png`);
      await assertNoHorizontalOverflow(page);

      await page.locator("#login-email").fill(account.email);
      await page.locator("#login-password").fill("ChangeMe!2026");
      await page.getByRole("button", { name: "Sign In" }).click();
      await expect(page.getByTestId("change-password-card")).toBeVisible();
      await page.keyboard.press("Tab");
      await captureScreenshot(
        page,
        "authentication",
        `change-password-${viewportName}.png`
      );
      await assertNoHorizontalOverflow(page);
      await page.locator("#new-password").fill(`E2E.${viewportName}!2026`);
      await page.locator("#confirm-password").fill(`E2E.${viewportName}!2026`);
      await page.getByRole("button", { name: "Save new password" }).click();
      await expect(page).toHaveURL(/\/tickets$/);
      await context.close();
    }
  });
});
