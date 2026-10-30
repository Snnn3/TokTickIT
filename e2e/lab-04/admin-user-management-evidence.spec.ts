import { expect, test } from "@playwright/test";
import {
  ACCOUNTS,
  cleanupE2EFixtures,
  resetSeed,
  signInAndChangePassword,
  VIEWPORTS,
} from "../lab-03/support";
import { captureEvidence } from "./evidence";

test.beforeEach(() => resetSeed());
test.afterEach(() => cleanupE2EFixtures());

test("E4-05 Admin User Management shows enabled Create user and supports keyboard use", async ({
  page,
}, testInfo) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  await signInAndChangePassword(
    page,
    ACCOUNTS.admin,
    "E2E.UserManagement.Admin!2026"
  );

  const view = page.getByTestId("user-management-view");
  const table = page.getByTestId("users-table");
  const createUser = page.getByTestId("create-user-btn");
  await expect(view).toBeVisible();
  await expect(table).toBeVisible();
  await expect(page.getByTestId(/user-row-/)).toHaveCount(17);
  await expect(table).not.toContainText("e2e.");
  await expect(createUser).toBeVisible();
  await expect(createUser).toBeEnabled();
  expect(
    await createUser.evaluate((element) => getComputedStyle(element).opacity)
  ).toBe("1");

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  let createUserFocused = false;
  for (let tab = 0; tab < 30; tab += 1) {
    await page.keyboard.press("Tab");
    if (
      await createUser.evaluate((element) => element === document.activeElement)
    ) {
      createUserFocused = true;
      break;
    }
  }
  expect(createUserFocused).toBe(true);
  await page.keyboard.press("Enter");

  const dialog = page.getByTestId("create-user-dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#user-name")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Close dialog" })
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  const submit = dialog.getByRole("button", { name: "Create user" });
  await expect(submit).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close dialog" })
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await captureEvidence(
    page,
    testInfo,
    "user-management",
    "admin-create-user-enabled-desktop",
    "E4-05",
    "ADMINISTRATOR",
    "The clean seeded Admin User Management view shows the enabled Create user button. Tab and Enter open the dialog, focus stays trapped at both ends, and Escape closes it."
  );
});
