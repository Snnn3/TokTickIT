import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "../../server/node_modules/@prisma/client";
import {
  DASHBOARD_ACCOUNTS,
  DASHBOARD_PASSWORD,
  resetDashboardTickets,
} from "../../server/tests/helpers/dashboard-fixtures";
import { requireDisposableDatabase } from "../../server/tests/helpers/disposable-database";
import type { StaffDashboardResponse } from "../../client/src/types/dashboard";

const db = new PrismaClient({ datasourceUrl: requireDisposableDatabase() });
test.afterAll(async () => {
  await db.$disconnect();
});
test.beforeEach(async ({}, testInfo) => {
  await resetDashboardTickets(db, !testInfo.title.startsWith("empty"));
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
  if (account !== "staff" && account !== "secondStaff")
    await page.goto("/dashboard/staff");
}

async function snapshot(page: Page): Promise<StaffDashboardResponse> {
  const response = await page.request.get("/api/dashboard/staff");
  expect(response.status()).toBe(200);
  return response.json();
}

async function capture(page: Page, name: string) {
  const directory = join(
    "artifacts",
    "lab-04",
    "screenshots",
    "staff-dashboard"
  );
  mkdirSync(directory, { recursive: true });
  await page.screenshot({
    path: join(directory, `${name}.png`),
    fullPage: true,
  });
  writeFileSync(
    join(directory, `${name}.json`),
    `${JSON.stringify(
      {
        testId: "E4-03",
        test: test.info().title,
        screenshot: `${name}.png`,
        role: name.startsWith("requester-") ? "REQUESTER" : "IT_STAFF",
        route: new URL(page.url()).pathname,
        viewport: page.viewportSize(),
        fullPage: true,
        capturedAt: new Date().toISOString(),
        expectedResult:
          "Dashboard state and role/flow assertions in the named E4-03 journey pass; no clipping or horizontal overflow in populated views",
      },
      null,
      2
    )}\n`
  );
}

test("empty workspace shows zero status groups and helpful empty drill-downs", async ({
  page,
}) => {
  await signIn(page);
  await expect(
    page.getByLabel("Open Tickets: 0", { exact: true })
  ).toBeVisible();
  await expect(page.getByTestId("recent-tickets-empty")).toBeVisible();
  await expect(page.getByTestId("recent-actions-empty")).toBeVisible();
  const data = await snapshot(page);
  expect(data.metrics).toEqual({
    openTickets: 0,
    unassignedTickets: 0,
    myOwnedTickets: 0,
    myActiveActions: 0,
  });
  expect(data.groupings.ticketsByStatus).toHaveLength(8);
  expect(
    data.groupings.ticketsByStatus.every((group) => group.count === 0)
  ).toBe(true);
  await capture(page, "empty-desktop");
  await page.getByLabel("Open Tickets: 0", { exact: true }).click();
  await expect(page.getByTestId("queue-no-results")).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId("staff-dashboard-view")).toBeVisible();
});

test("populated Staff dashboard has authoritative counts, latest-five ties, Bangkok time and responsive layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page);
  const data = await snapshot(page);
  expect(data.metrics).toEqual({
    openTickets: 5,
    unassignedTickets: 2,
    myOwnedTickets: 2,
    myActiveActions: 2,
  });
  expect(data.groupings.ticketsByStatus).toEqual([
    { status: "NEW", count: 1 },
    { status: "OPEN", count: 1 },
    { status: "IN_PROGRESS", count: 1 },
    { status: "WAITING_FOR_REQUESTER", count: 1 },
    { status: "RESOLVED", count: 1 },
    { status: "CLOSED", count: 1 },
    { status: "REOPENED", count: 1 },
    { status: "CANCELLED", count: 1 },
  ]);
  expect(data.lists.recentTickets.map((ticket) => ticket.number)).toEqual([
    "TKT-TEST-00008",
    "TKT-TEST-00007",
    "TKT-TEST-00006",
    "TKT-TEST-00005",
    "TKT-TEST-00004",
  ]);
  expect(data.lists.myRecentActions.map((action) => action.title)).toEqual([
    "Alice action 7",
    "Alice action 6",
    "Alice action 5",
    "Alice action 4",
    "Alice action 3",
  ]);
  const bangkok = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(data.asOf));
  await expect(page.getByTestId("staff-dashboard-view")).toContainText(bangkok);
  for (const [name, viewport] of Object.entries({
    desktop: { width: 1366, height: 900 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 812 },
  })) {
    await page.setViewportSize(viewport);
    await expect(
      page.getByRole("heading", { name: "Tickets by Status" })
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1
      )
    ).toBe(true);
    await page.getByLabel("Open Tickets: 5", { exact: true }).focus();
    await expect(
      page.getByLabel("Open Tickets: 5", { exact: true })
    ).toBeFocused();
    if (name === "mobile") {
      const targets = await page
        .getByTestId("staff-dashboard-view")
        .locator("a, button")
        .evaluateAll((elements) =>
          elements.map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              label: element.textContent,
              width: rect.width,
              height: rect.height,
            };
          })
        );
      for (const target of targets) {
        expect(
          target.width,
          target.label ?? "mobile control"
        ).toBeGreaterThanOrEqual(44);
        expect(
          target.height,
          target.label ?? "mobile control"
        ).toBeGreaterThanOrEqual(44);
      }
    }
    await capture(page, `populated-${name}`);
  }
  expect(errors).toEqual([]);
});

test("metric and status drill-downs match counts and preserve filters across refresh, detail and browser-back", async ({
  page,
}) => {
  await signIn(page);
  for (const [name, total, path] of [
    ["Open Tickets: 5", 5, "/api/staff/tickets"],
    ["Unassigned Tickets: 2", 2, "/api/staff/tickets"],
    ["My Owned Tickets: 2", 2, "/api/staff/tickets"],
    ["My Active Actions: 2", 2, "/api/staff/actions"],
    ["CLOSED tickets: 1", 1, "/api/staff/tickets"],
  ] as const) {
    const link = page.getByRole("link", { name, exact: true });
    const destination = new URL((await link.getAttribute("href"))!, page.url());
    const response = page.waitForResponse((result) => {
      const url = new URL(result.url());
      return (
        url.pathname === path &&
        result.status() === 200 &&
        [...destination.searchParams].every(
          ([key, value]) => url.searchParams.get(key) === value
        )
      );
    });
    await link.click();
    expect((await (await response).json()).total).toBe(total);
    const filteredUrl = page.url();
    if (path === "/api/staff/tickets") {
      await expect(page.getByTestId("queue-result-count")).toHaveText(
        `${total} ${total === 1 ? "ticket" : "tickets"}`
      );
    } else {
      await expect(page.getByTestId("action-pagination")).toContainText(
        `(${total} actions)`
      );
    }
    await page.reload();
    await expect(page).toHaveURL(filteredUrl);
    if (path === "/api/staff/tickets") {
      await expect(page.getByTestId("queue-dashboard-filters")).toBeVisible();
      await page
        .getByTestId("queue-row")
        .first()
        .getByRole("button", { name: "Open", exact: true })
        .click();
      await expect(page.getByTestId("staff-detail-view")).toBeVisible();
      await page
        .getByRole("button", { name: "Back to Ticket Queue", exact: true })
        .click();
      await expect(page).toHaveURL(filteredUrl);
      await page.goBack();
      await page.goBack();
      await expect(page).toHaveURL(filteredUrl);
      await page.goBack();
    } else await page.goBack();
    await expect(page.getByTestId("staff-dashboard-view")).toBeVisible();
  }
});

test("recent links carry fixed bounds, paginate current-user actions and focus action detail", async ({
  page,
}) => {
  await signIn(page);
  const recentTickets = page.getByRole("region", {
    name: "Recently Updated Tickets",
  });
  const recentActions = page.getByRole("region", { name: "My Recent Actions" });
  for (const [region, path, total] of [
    [recentTickets, "/api/staff/tickets", 8],
    [recentActions, "/api/staff/actions", 7],
  ] as const) {
    const href = await region
      .getByRole("link", { name: "View all" })
      .getAttribute("href");
    const bounds = new URL(href!, page.url()).searchParams;
    expect(
      new Date(bounds.get("to")!).getTime() -
        new Date(bounds.get("from")!).getTime()
    ).toBe(604800000);
    const response = page.waitForResponse(
      (result) =>
        new URL(result.url()).pathname === path && result.status() === 200
    );
    await region.getByRole("link", { name: "View all" }).click();
    expect((await (await response).json()).total).toBe(total);
    const filteredUrl = page.url();
    if (path === "/api/staff/actions") {
      const appliedBounds = new URL(filteredUrl).searchParams;
      await page.getByLabel("Per page:").selectOption("5");
      await expect(page.getByTestId("action-pagination")).toContainText(
        "Page 1 of 2 (7 actions)"
      );
      await page.getByRole("button", { name: "Next page" }).click();
      await expect(page.getByTestId("action-pagination")).toContainText(
        "Page 2 of 2 (7 actions)"
      );
      expect(new URL(page.url()).searchParams.get("from")).toBe(
        appliedBounds.get("from")
      );
      expect(new URL(page.url()).searchParams.get("to")).toBe(
        appliedBounds.get("to")
      );
      await page.goto(filteredUrl);
    }
    await page.goto("/dashboard/staff");
  }
  const actionLink = page.getByRole("link", {
    name: "Alice action 7",
    exact: true,
  });
  const href = await actionLink.getAttribute("href");
  await actionLink.click();
  await expect(page.locator(new URL(href!, page.url()).hash)).toBeFocused();
  await page
    .getByRole("button", { name: "Back to Ticket Queue", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/staff$/);
});

test("all queue choices persist after detail return, browser-back and reload on a filtered second page", async ({
  page,
}) => {
  await signIn(page);
  await page.getByLabel("Open Tickets: 5", { exact: true }).click();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.getByPlaceholder("Search number or summary").fill("Dashboard");
  await page
    .getByLabel("Filter by category")
    .selectOption({ label: "Account and Access" });
  await page.getByLabel("Filter by requested priority").selectOption("MEDIUM");
  await page.getByLabel("Filter by IT priority").selectOption("HIGH");
  await page.getByLabel("Sort by:").selectOption("number");
  await page.getByLabel("Sort order").selectOption("asc");
  await page.getByLabel("Page size", { exact: true }).selectOption("5");
  await expect(page.getByTestId("queue-result-count")).toHaveText("8 tickets");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByTestId("pagination-page-info")).toContainText(
    "Page 2 of 2"
  );
  const filteredUrl = page.url();
  await page
    .getByTestId("queue-row")
    .first()
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(page.getByTestId("staff-detail-view")).toBeVisible();
  await page
    .getByRole("button", { name: "Back to Ticket Queue", exact: true })
    .click();
  await expect(page).toHaveURL(filteredUrl);
  await page.reload();
  await expect(page.getByTestId("pagination-page-info")).toContainText(
    "Page 2 of 2"
  );
  await expect(page.getByPlaceholder("Search number or summary")).toHaveValue(
    "Dashboard"
  );
  await expect(page.getByLabel("Filter by category")).toHaveValue("1");
  await expect(page.getByLabel("Filter by requested priority")).toHaveValue(
    "MEDIUM"
  );
  await expect(page.getByLabel("Filter by IT priority")).toHaveValue("HIGH");
  await expect(page.getByLabel("Sort by:")).toHaveValue("number");
  await expect(page.getByLabel("Sort order")).toHaveValue("asc");
  await expect(page.getByLabel("Page size", { exact: true })).toHaveValue("5");
  await page
    .getByTestId("queue-row")
    .first()
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(page.getByTestId("staff-detail-view")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(filteredUrl);
  await expect(page.getByTestId("pagination-page-info")).toContainText(
    "Page 2 of 2"
  );
});

test("Administrator and second Staff see their own performed work, not work assigned to them", async ({
  browser,
}) => {
  for (const account of ["admin", "secondStaff"] as const) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, account);
      const data = await snapshot(page);
      expect(data.metrics.myActiveActions).toBe(1);
      expect(data.metrics.myOwnedTickets).toBe(account === "admin" ? 0 : 1);
      expect(data.lists.myRecentActions.map((action) => action.title)).toEqual([
        `${DASHBOARD_ACCOUNTS[account].name} action`,
      ]);
      await expect(
        page.getByRole("region", { name: "My Recent Actions" })
      ).not.toContainText("Alice action");
      await page.getByLabel("My Active Actions: 1", { exact: true }).click();
      await expect(page.getByTestId("action-pagination")).toContainText(
        "(1 actions)"
      );
    } finally {
      await context.close();
    }
  }
});

test("anonymous and Requester cannot retrieve Staff data or navigate its dashboard", async ({
  page,
}) => {
  expect((await page.request.get("/api/dashboard/staff")).status()).toBe(401);
  await signIn(page, "requester");
  await expect(page.getByTestId("forbidden-panel")).toBeVisible();
  await expect(page.getByTestId("staff-dashboard-view")).toHaveCount(0);
  const response = await page.request.get("/api/dashboard/staff");
  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({
    error: {
      code: "FORBIDDEN",
      message: "Your role does not permit this operation",
    },
  });
  await capture(page, "requester-forbidden-desktop");
});

test("loading, stale refresh and safe failure retry are visible without replacing real counts", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolveGate) => {
    release = resolveGate;
  });
  await page.route("**/api/dashboard/staff", async (route) => {
    await gate;
    await route.continue();
  });
  await signIn(page);
  await expect(page.getByTestId("staff-dashboard-loading")).toBeVisible();
  await capture(page, "loading-desktop");
  release();
  await expect(
    page.getByLabel("Open Tickets: 5", { exact: true })
  ).toBeVisible();
  await page.unroute("**/api/dashboard/staff");
  await page.route("**/api/dashboard/staff", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: '{"error":{"code":"UNEXPECTED","message":"safe failure"}}',
    })
  );
  await page.getByRole("button", { name: "Refresh dashboard" }).click();
  await expect(page.getByRole("alert")).toContainText("snapshot is stale");
  await expect(
    page.getByLabel("Open Tickets: 5", { exact: true })
  ).toBeVisible();
  await capture(page, "stale-failure-desktop");
  await page.unroute("**/api/dashboard/staff");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("unbroken action titles wrap and action-list controls meet mobile targets", async ({
  page,
}) => {
  const longTitle = "L".repeat(120);
  const action = await db.actionTaken.findFirstOrThrow({
    where: { title: "Alice action 7" },
  });
  await db.actionTaken.update({
    where: { id: action.id },
    data: { title: longTitle },
  });

  await signIn(page);
  await page.setViewportSize({ width: 375, height: 812 });
  const dashboardTitle = page
    .getByTestId("staff-dashboard-view")
    .getByRole("link", { name: longTitle, exact: true });
  await expect(dashboardTitle).toBeVisible();
  const dashboardLayout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    offenders: Array.from(document.querySelectorAll("*"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          className:
            typeof element.className === "string" ? element.className : "",
          text: element.textContent?.slice(0, 140),
          left: rect.left,
          right: rect.right,
          width: rect.width,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        };
      })
      .filter((element) => element.right > window.innerWidth + 1)
      .slice(0, 12),
  }));
  expect(
    dashboardLayout.documentWidth,
    JSON.stringify(dashboardLayout)
  ).toBeLessThanOrEqual(376);

  await page.goto("/staff/actions?performedBy=me&page=1&pageSize=5");
  const actionList = page.getByTestId("staff-actions-list-view");
  await expect(actionList.getByRole("link", { name: longTitle })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    )
  ).toBe(true);

  const controls = await actionList
    .locator("a, button, select")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          name:
            element.getAttribute("aria-label") ??
            element.textContent?.trim() ??
            element.tagName,
          width: rect.width,
          height: rect.height,
        };
      })
    );
  expect(controls.length).toBeGreaterThan(0);
  for (const control of controls) {
    expect(control.width, `${control.name} width`).toBeGreaterThanOrEqual(44);
    expect(control.height, `${control.name} height`).toBeGreaterThanOrEqual(44);
  }
});
