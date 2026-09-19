import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { expect, type Page } from "@playwright/test";

export const REPO_ROOT = resolve(__dirname, "../..");
export const INITIAL_PASSWORD = "ChangeMe!2026";

export const VIEWPORTS = {
  desktop: { width: 1366, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
} as const;

export const ACCOUNTS = {
  requester: {
    name: "Anucha Wongchai",
    email: "anucha.wongchai@example.com",
    role: "REQUESTER",
    landing: "/tickets",
  },
  secondRequester: {
    name: "Busaba Srisawat",
    email: "busaba.srisawat@example.com",
    role: "REQUESTER",
    landing: "/tickets",
  },
  thirdRequester: {
    name: "Chatchai Promma",
    email: "chatchai.promma@example.com",
    role: "REQUESTER",
    landing: "/tickets",
  },
  staff: {
    name: "Kittipong Saelim",
    email: "kittipong.saelim@example.com",
    role: "IT_STAFF",
    landing: "/staff/queue",
  },
  secondStaff: {
    name: "Manasporn Thongdee",
    email: "manasporn.thongdee@example.com",
    role: "IT_STAFF",
    landing: "/staff/queue",
  },
  thirdStaff: {
    name: "Pornchai Rakdee",
    email: "pornchai.rakdee@example.com",
    role: "IT_STAFF",
    landing: "/staff/queue",
  },
  admin: {
    name: "Apinya Ratchada",
    email: "apinya.ratchada@example.com",
    role: "ADMINISTRATOR",
    landing: "/admin/users",
  },
} as const;

export type Account = (typeof ACCOUNTS)[keyof typeof ACCOUNTS];

export type ApiResponse<T> = {
  status: number;
  body: T;
};

export type QueueTicket = {
  id: number;
  number: string;
  summary: string;
  status: string;
  requester: { id: number; name: string };
  owner: { id: number; name: string } | null;
};

export type QueueResponse = {
  tickets: QueueTicket[];
  total: number;
  totalPages: number;
};

/** Restore the documented local fixtures before every browser journey. */
export function resetSeed(): void {
  if (process.platform === "win32") {
    execFileSync(
      process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
      ["/d", "/s", "/c", "npm run db:seed --prefix server"],
      { cwd: REPO_ROOT, stdio: "inherit" }
    );
    return;
  }

  execFileSync("npm", ["run", "db:seed", "--prefix", "server"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
}

export async function signInAndChangePassword(
  page: Page,
  account: Account,
  newPassword: string
): Promise<void> {
  await page.goto("/login");
  await expect(page.getByTestId("login-card")).toBeVisible();
  await page.locator("#login-email").fill(account.email);
  await page.locator("#login-password").fill(INITIAL_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByTestId("change-password-card")).toBeVisible();
  await page.locator("#new-password").fill(newPassword);
  await page.locator("#confirm-password").fill(newPassword);
  await expect(
    page.getByRole("button", { name: "Save new password" })
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(account.landing)}$`));
  await expect(page.getByTestId("identity-chip")).toContainText(account.name);
}

export async function signInWithPassword(
  page: Page,
  account: Account,
  password: string
): Promise<void> {
  await page.goto("/login");
  await page.locator("#login-email").fill(account.email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(account.landing)}$`));
  await expect(page.getByTestId("identity-chip")).toContainText(account.name);
}

export async function requestJson<T>(
  page: Page,
  url: string,
  options: { method?: string; body?: unknown } = {}
): Promise<ApiResponse<T>> {
  const response = await page.evaluate(
    async ({ body, method, url: requestUrl }) => {
      const result = await fetch(requestUrl, {
        body: body === undefined ? undefined : JSON.stringify(body),
        headers:
          body === undefined
            ? undefined
            : { "Content-Type": "application/json" },
        method,
      });
      const responseBody = await result.json().catch(() => null);
      return { body: responseBody, status: result.status };
    },
    { body: options.body, method: options.method ?? "GET", url }
  );

  return response as ApiResponse<T>;
}

export async function getQueue(page: Page): Promise<QueueResponse> {
  const response = await requestJson<QueueResponse>(
    page,
    "/api/staff/tickets?sort=number&order=asc&page=1&pageSize=20"
  );
  expect(response.status).toBe(200);
  return response.body;
}

export async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  await page.locator("button, input, select, textarea, a").first().focus();
  const result = await page.evaluate(() => ({
    activeElement: document.activeElement?.tagName ?? "",
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(result.scrollWidth).toBeLessThanOrEqual(result.viewportWidth + 1);
  expect(result.activeElement).not.toBe("BODY");
}

export async function captureScreenshot(
  page: Page,
  screen:
    | "authentication"
    | "staff-queue"
    | "staff-ticket-detail"
    | "user-management",
  filename: string
): Promise<void> {
  const destination = join(
    REPO_ROOT,
    "artifacts",
    "lab-03",
    "screenshots",
    screen,
    filename
  );
  mkdirSync(dirname(destination), { recursive: true });
  await page.screenshot({ fullPage: true, path: destination });
}

export function writeEvidence(relativePath: string, value: unknown): void {
  const destination = join(REPO_ROOT, "artifacts", "lab-03", relativePath);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
