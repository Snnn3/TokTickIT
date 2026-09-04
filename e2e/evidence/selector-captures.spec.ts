import { test, expect, type Page, type Route } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

/**
 * Selector evidence captures for the Lab 2 report (NOT part of graded e2e/lab-02 suite).
 * Run explicitly:  npx playwright test e2e/evidence/selector-captures.spec.ts
 * Output:          artifacts/lab-02/screenshots/requester-selection/*.png
 *
 * Covers ui-spec section 6 states missing from the report:
 * initial dropdown + Continue disabled, dropdown selected + Continue enabled,
 * loading, empty, failure (+Retry), shell with requester chip + Change Requester,
 * plus desktop/tablet/mobile responsive shots.
 */

const SHOTS = path.join(process.cwd(), "artifacts", "lab-02", "screenshots", "requester-selection");

test.describe.configure({ mode: "serial" });
test.use({ actionTimeout: 15000 });

async function getFirstRequesterLabel(page: Page): Promise<string> {
  const res = await page.request.get("http://localhost:3000/api/requesters");
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  const people: { name: string; email: string }[] = json.requesters ?? [];
  expect(people.length).toBeGreaterThan(0);
  return `${people[0].name} (${people[0].email})`;
}

async function gotoFreshSelector(page: Page) {
  // Requester persists in sessionStorage — clear it so "/" renders the selector, not the shell.
  await page.goto("/");
  await page.evaluate(() => sessionStorage.clear());
  await page.goto("/");
}

test("selector state captures for report", async ({ page }) => {
  test.setTimeout(180000);
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.setViewportSize({ width: 1366, height: 768 });

  const label = await getFirstRequesterLabel(page);
  const shot = async (name: string) => {
    const p = path.join(SHOTS, name);
    await page.screenshot({ path: p });
    expect(fs.existsSync(p)).toBe(true);
  };

  // ---- 01 initial: dropdown enabled, Continue disabled ----
  await gotoFreshSelector(page);
  await expect(page.getByTestId("requester-form")).toBeVisible({ timeout: 15000 });
  const select = page.locator("#requester-select");
  const cont = page.getByRole("button", { name: "Continue" });
  await expect(select).toBeEnabled();
  await expect(cont).toBeDisabled();
  await expect(page.getByText("This is not a login screen")).toBeVisible();
  await shot("01-initial-dropdown-continue-disabled.png");

  // ---- 02 dropdown focused + option selected => Continue enabled ----
  await select.focus();
  await expect(select).toBeFocused();
  await select.selectOption({ label });
  await expect(cont).toBeEnabled();
  await shot("02-dropdown-selected-continue-enabled.png");

  // ---- 03 shell after Continue: chip + Change Requester ----
  await cont.click();
  await expect(page.getByTestId("requester-chip")).toBeVisible();
  await expect(page.getByTestId("change-requester-btn")).toBeVisible();
  await expect(page.getByText("Signed in as")).toBeVisible();
  await shot("03-shell-with-requester-chip-change.png");

  // ---- 04 loading state (delay /api/requesters 2.5s) ----
  const slowReq = async (route: Route) => {
    if (route.request().url().includes("/api/requesters") && route.request().method() === "GET") {
      await new Promise((r) => setTimeout(r, 2500));
    }
    await route.continue();
  };
  await page.route("**/api/requesters", slowReq);
  await gotoFreshSelector(page);
  await expect(page.getByTestId("loading-state")).toBeVisible();
  await shot("04-loading-state.png");
  await expect(page.getByTestId("requester-form")).toBeVisible({ timeout: 15000 });
  await page.unroute("**/api/requesters", slowReq);

  // ---- 05 empty state (mock zero requesters) ----
  await page.goto("/");
  await page.evaluate(() => sessionStorage.clear());
  await page.route("**/api/requesters", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ requesters: [] }),
    }),
  );
  await page.goto("/");
  await expect(page.getByTestId("empty-state")).toBeVisible();
  await expect(page.getByText("No active requesters available")).toBeVisible();
  await shot("05-empty-state.png");
  await page.unroute("**/api/requesters");

  // ---- 06 failure state (mock 500) + Retry ----
  await page.goto("/");
  await page.evaluate(() => sessionStorage.clear());
  await page.route("**/api/requesters", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "UNEXPECTED", message: "boom" } }),
    }),
  );
  await page.goto("/");
  await expect(page.getByTestId("error-state")).toBeVisible();
  await expect(page.getByText(/Unable to load development requesters/)).toBeVisible();
  await shot("06-failure-state.png");
  await page.unroute("**/api/requesters");

  // ---- 07 responsive: initial + shell at desktop/tablet/mobile ----
  const viewports = [
    { name: "desktop", width: 1366, height: 768 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ];
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");
    await expect(page.getByTestId("requester-form")).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(SHOTS, `responsive-initial-${vp.name}.png`), fullPage: true });
    // shell shot proves no horizontal scroll + chip/Change collapse into menu on mobile
    await page.locator("#requester-select").selectOption({ label });
    await page.getByRole("button", { name: "Continue" }).click();
    // On <768px the chip lives inside the collapsed hamburger menu — open it first.
    const toggler = page.getByRole("button", { name: "Toggle navigation" });
    if (await toggler.isVisible()) {
      await toggler.click();
    }
    await expect(page.getByTestId("requester-chip")).toBeVisible();
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(noOverflow).toBe(true);
    await page.screenshot({ path: path.join(SHOTS, `responsive-shell-${vp.name}.png`), fullPage: true });
    // back to selector for next viewport
    await page.getByTestId("change-requester-btn").click();
    await expect(page.getByTestId("requester-form")).toBeVisible({ timeout: 15000 });
  }
});
