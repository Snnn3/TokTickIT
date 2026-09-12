import {
  test,
  expect,
  type Page,
  type Route,
  type APIRequestContext,
} from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

/**
 * Report gap-fill captures for Lab 2 Parts 6/7/8 (NOT part of the graded e2e/lab-02 suite).
 * Run explicitly:  npx playwright test e2e/evidence/report-gaps.spec.ts
 * Output:          artifacts/lab-02/evidence/part6|7|8-*.png  (desktop 1366x768)
 *
 * Part 6: initial create form (also shows loaded reference data), 201 create proof envelope.
 * Part 7: search / filters / sorting / pagination in-action, loading skeletons, API failure + Retry.
 * Part 8: owned-detail full shot, add-attachment 201 proof, download-active 200 proof, 403 proof.
 */

const API = "http://localhost:3000";
const OUT = path.join(process.cwd(), "artifacts", "lab-02", "evidence");

test.describe.configure({ mode: "serial" });
test.use({ actionTimeout: 15000 });

async function reqHeaders(id: number) {
  return { "X-Requester-Id": String(id) };
}

async function getPeople(request: APIRequestContext) {
  const res = await request.get(`${API}/api/requesters`);
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  return json.requesters as { id: number; name: string; email: string }[];
}

async function getRefIds(request: APIRequestContext, anuchaId: number) {
  const h = await reqHeaders(anuchaId);
  const [cats, systems] = await Promise.all([
    request.get(`${API}/api/reference/categories`, { headers: h }),
    request.get(`${API}/api/reference/systems`, { headers: h }),
  ]);
  expect(cats.ok()).toBeTruthy();
  expect(systems.ok()).toBeTruthy();
  const cj = await cats.json();
  const sj = await systems.json();
  return {
    categoryId: String((cj.categories ?? [])[0].id),
    systemId: String((sj.systems ?? [])[0].id),
  };
}

async function createTicketApi(
  request: APIRequestContext,
  anuchaId: number,
  summary: string
) {
  const { categoryId, systemId } = await getRefIds(request, anuchaId);
  const res = await request.post(`${API}/api/tickets`, {
    headers: await reqHeaders(anuchaId),
    multipart: {
      summary,
      description: "Report gap-fill proof ticket.",
      categoryId,
      systemId,
      requestedPriority: "MEDIUM",
    },
  });
  expect(res.status()).toBe(201);
  const json = await res.json();
  return json.ticket as { id: number; number: string };
}

async function selectRequester(page: Page, label: string) {
  await page.goto("/");
  await page.evaluate(() => sessionStorage.clear());
  await page.goto("/");
  await page.locator("#requester-select").selectOption({ label });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("requester-chip")).toBeVisible();
}

async function envelope(
  page: Page,
  title: string,
  subtitle: string,
  status: number,
  body: unknown,
  outFile: string
) {
  const pretty = JSON.stringify(body, null, 2).replace(/</g, "&lt;");
  await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{font-family:Consolas,monospace;background:#F5F7F6;margin:0;padding:32px;}
    .card{max-width:900px;margin:0 auto;background:#fff;border:1px solid #dde5e1;border-radius:8px;padding:24px;}
    h1{font-size:20px;color:#006B3C;margin:0 0 4px;}p{color:#5B6B62;font-size:13px;}
    pre{background:#0f1f19;color:#d7e5dd;padding:16px;border-radius:6px;font-size:13px;overflow:auto;}</style>
    </head><body><div class="card"><h1>${title}</h1><p>${subtitle}</p>
    <p>HTTP ${status}</p><pre>${pretty}</pre></div></body></html>`);
  await page.screenshot({ path: path.join(OUT, outFile) });
  expect(fs.existsSync(path.join(OUT, outFile))).toBe(true);
}

test("Part 6 gaps: initial form + 201 proof", async ({ page, request }) => {
  test.setTimeout(180000);
  fs.mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  const people = await getPeople(request);
  const anucha = people.find((p) => p.name.includes("Anucha"))!;
  const label = `${anucha.name} (${anucha.email})`;

  // Initial create form with reference data loaded (Category/System/Priority populated).
  await selectRequester(page, label);
  await page.getByRole("button", { name: "Create Ticket" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Create Support Ticket", level: 1 })
  ).toBeVisible();
  // While the reference fetch is in flight each select holds a single
  // "Loading..." option, so a one-shot count() races the network: it passes on a
  // fast machine and fails on a slow one. Poll instead, so the assertion waits
  // for the options to arrive.
  await expect
    .poll(() => page.locator("#category-select option").count(), {
      timeout: 15000,
    })
    .toBeGreaterThan(1);
  await expect
    .poll(() => page.locator("#system-select option").count(), {
      timeout: 15000,
    })
    .toBeGreaterThan(1);
  await page.screenshot({
    path: path.join(OUT, "part6-initial-create-form.png"),
  });

  // Backend proof: real 201 create, requester id echoed back.
  const summary = `Report Part6 proof - ${Date.now()}`;
  const { categoryId, systemId } = await getRefIds(request, anucha.id);
  const res = await request.post(`${API}/api/tickets`, {
    headers: await reqHeaders(anucha.id),
    multipart: {
      summary,
      description: "Report gap-fill proof ticket.",
      categoryId,
      systemId,
      requestedPriority: "MEDIUM",
    },
  });
  expect(res.status()).toBe(201);
  const created = await res.json();
  expect(created.ticket.requester.id).toBe(anucha.id);
  await envelope(
    page,
    "201 ticket created — backend proof (Part 6)",
    `Official number issued by backend; ticket.requester.id = ${anucha.id} (${anucha.name}) proves ownership binding.`,
    201,
    created,
    "part6-201-created-proof.png"
  );
});

test("Part 7 gaps: search/filter/sort/page/loading/failure", async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  fs.mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  const people = await getPeople(request);
  const anucha = people.find((p) => p.name.includes("Anucha"))!;
  const label = `${anucha.name} (${anucha.email})`;
  const h = await reqHeaders(anucha.id);

  // Ensure >= 6 tickets so pagination (pageSize 5 => 2 pages) is demonstrable.
  const countRes = await request.get(`${API}/api/tickets?page=1&pageSize=20`, {
    headers: h,
  });
  const countJson = await countRes.json();
  const have: number = countJson.total ?? (countJson.tickets ?? []).length;
  for (let i = have; i < 6; i++) {
    await createTicketApi(
      request,
      anucha.id,
      `Report Part7 pagination seed ${i} - ${Date.now()}`
    );
  }
  const listRes = await request.get(`${API}/api/tickets?page=1&pageSize=20`, {
    headers: h,
  });
  const listJson = await listRes.json();
  const tickets = listJson.tickets as {
    id: number;
    number: string;
    summary: string;
    categoryId: number;
    requestedPriority: string;
  }[];
  expect(tickets.length).toBeGreaterThanOrEqual(6);
  // The loop above only sets a floor, and nothing ever deletes tickets, so this
  // requester's count grows with every E2E run. Derive the expected page count
  // instead of hard-coding it.
  const total: number = listJson.total ?? tickets.length;
  const expectedPages = Math.ceil(total / 5);
  const first = tickets[0];
  const searchWord = first.summary
    .split(/\s+/)
    .find((w) => w.replace(/[^A-Za-z]/g, "").length >= 4)!;

  await selectRequester(page, label);
  await expect(
    page.getByRole("heading", { name: "My Tickets", level: 1 })
  ).toBeVisible();

  // Loading skeletons: delay list fetch, trigger via search keystroke.
  const slowList = async (route: Route) => {
    if (
      route.request().method() === "GET" &&
      route.request().url().includes("/api/tickets")
    ) {
      await new Promise((r) => setTimeout(r, 2500));
    }
    try {
      await route.continue();
    } catch {
      // A request still in flight when the handler is removed by `unroute` is
      // already handled by then, and continuing it throws. Nothing to do.
    }
  };
  await page.route("**/api/tickets*", slowList);
  await page.locator("#ticket-search").fill("loading-probe-zzz");
  await expect(page.getByTestId("tickets-loading")).toBeVisible();
  await page.screenshot({
    path: path.join(OUT, "part7-loading-skeletons.png"),
  });
  await page.unroute("**/api/tickets*", slowList);
  await expect(page.getByTestId("no-results-state")).toBeVisible({
    timeout: 15000,
  });
  await page.locator("#ticket-search").fill("");

  // Search in action.
  await page.locator("#ticket-search").fill(searchWord);
  await expect(page.getByText(first.number).first()).toBeVisible({
    timeout: 15000,
  });
  await page.screenshot({ path: path.join(OUT, "part7-search-in-action.png") });
  await page.locator("#ticket-search").fill("");
  await expect(page.getByTestId("pagination-page-info")).toBeVisible({
    timeout: 15000,
  });

  // Filters in action (category + priority taken from a real ticket so results are non-empty).
  await page.locator("#category-filter").selectOption(String(first.categoryId));
  await page.locator("#priority-filter").selectOption(first.requestedPriority);
  await expect(page.getByText(first.number).first()).toBeVisible({
    timeout: 15000,
  });
  await page.screenshot({
    path: path.join(OUT, "part7-filters-in-action.png"),
  });
  await page.getByRole("button", { name: "Clear filters" }).click();

  // Sorting in action (Number ascending).
  await page.locator("#sort-select").selectOption("number");
  await page.locator("#order-select").selectOption("asc");
  await expect(page.getByTestId("pagination-page-info")).toBeVisible({
    timeout: 15000,
  });
  await page.screenshot({
    path: path.join(OUT, "part7-sorting-in-action.png"),
  });

  // Pagination in action (5 per page, page 2).
  await page.locator("#page-size-select").selectOption("5");
  await expect(page.getByTestId("pagination-page-info")).toContainText(
    `Page 1 of ${expectedPages}`,
    { timeout: 15000 }
  );
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByTestId("pagination-page-info")).toContainText(
    `Page 2 of ${expectedPages}`,
    { timeout: 15000 }
  );
  await page.screenshot({
    path: path.join(OUT, "part7-pagination-in-action.png"),
  });

  // API failure + Retry (mock 500 on list fetch).
  await page.route("**/api/tickets*", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "UNEXPECTED", message: "Simulated outage" },
        }),
      });
    }
    return route.continue();
  });
  await page.locator("#ticket-search").fill("failure-probe-zzz");
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible({
    timeout: 15000,
  });
  await page.screenshot({
    path: path.join(OUT, "part7-api-failure-retry.png"),
  });
  await page.unroute("**/api/tickets*");
});

test("Part 8 gaps: owned detail + add 201 + download 200 + 403", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  fs.mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  const people = await getPeople(request);
  const anucha = people.find((p) => p.name.includes("Anucha"))!;
  const other = people.find((p) => p.id !== anucha.id)!;
  const label = `${anucha.name} (${anucha.email})`;

  const ticket = await createTicketApi(
    request,
    anucha.id,
    `Report Part8 proof - ${Date.now()}`
  );

  // Owned detail full screenshot via UI.
  await selectRequester(page, label);
  await expect(
    page.getByRole("heading", { name: "My Tickets", level: 1 })
  ).toBeVisible();
  await page.locator("#ticket-search").fill(ticket.number);
  await expect(
    page.getByRole("button", { name: ticket.number }).first()
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: ticket.number }).first().click();
  await expect(page.getByTestId("ticket-detail-view")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText(ticket.number).first()).toBeVisible();
  await page.screenshot({
    path: path.join(OUT, "part8-owned-detail-full.png"),
    fullPage: true,
  });

  // Add attachment 201 proof (live API).
  const addRes = await request.post(
    `${API}/api/tickets/${ticket.id}/attachments`,
    {
      headers: await reqHeaders(anucha.id),
      multipart: {
        file: {
          name: "part8-proof.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("part8-proof-payload"),
        },
      },
    }
  );
  expect(addRes.status()).toBe(201);
  const added = await addRes.json();
  const attachmentId: number = added.attachment?.id ?? added.id;
  expect(attachmentId).toBeTruthy();
  await envelope(
    page,
    "201 attachment added — backend proof (Part 8)",
    `Attachment #${attachmentId} on owned ticket #${ticket.id} (${ticket.number}).`,
    201,
    added,
    "part8-add-attachment-201-proof.png"
  );

  // Download active 200 proof (headers + byte length, body is binary so envelope carries metadata).
  const dlRes = await request.get(
    `${API}/api/attachments/${attachmentId}/download`,
    {
      headers: await reqHeaders(anucha.id),
    }
  );
  expect(dlRes.status()).toBe(200);
  const dlBody = await dlRes.body();
  await envelope(
    page,
    "200 active-attachment download — backend proof (Part 8)",
    `Owner download of attachment #${attachmentId} streams bytes; removed attachments return 410 instead.`,
    200,
    {
      contentType: dlRes.headers()["content-type"],
      contentDisposition: dlRes.headers()["content-disposition"],
      contentLength: dlRes.headers()["content-length"],
      bytesReceived: dlBody.length,
    },
    "part8-download-200-proof.png"
  );

  // Cross-requester 403 proof (live API).
  const forbidRes = await request.get(`${API}/api/tickets/${ticket.id}`, {
    headers: await reqHeaders(other.id),
  });
  expect(forbidRes.status()).toBe(403);
  await envelope(
    page,
    "403 cross-requester denial — live API proof (Part 8)",
    `Requester ${other.name} (id ${other.id}) reads Requester ${anucha.name} ticket #${ticket.id}.`,
    403,
    await forbidRes.json(),
    "part8-403-cross-requester-proof.png"
  );

  // UI proof: the API-added attachment renders as a live row in Ticket Detail.
  await selectRequester(page, label);
  await expect(
    page.getByRole("heading", { name: "My Tickets", level: 1 })
  ).toBeVisible();
  await page.locator("#ticket-search").fill(ticket.number);
  await expect(
    page.getByRole("button", { name: ticket.number }).first()
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: ticket.number }).first().click();
  await expect(page.getByTestId("ticket-detail-view")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText("part8-proof.pdf")).toBeVisible();
  await page.screenshot({
    path: path.join(OUT, "part8-added-attachment-row.png"),
  });
});
