import { test, expect, type Page, type Route } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

/**
 * Submission evidence captures (NOT part of the graded E2E suite).
 * Run explicitly:  npx playwright test e2e/evidence
 * Output:          artifacts/lab-02/evidence/*.png  (desktop 1366x768 viewport shots)
 *
 * Covers the labsheet annotated captures: validation-failure, submitting/busy,
 * success with backend TKT number, invalid attachments (type + oversize),
 * backend-down banner with values preserved, A-vs-B isolation, empty vs
 * no-results, 403 cross-access (UI + API envelope), remove dialog, removed
 * row, and 410 re-download envelope.
 */

const API = "http://localhost:3000";
const EVIDENCE = path.join(process.cwd(), "artifacts", "lab-02", "evidence");

test.describe.configure({ mode: "serial" });
test.use({ actionTimeout: 15000 });

async function selectRequester(page: Page, label: string) {
  await page.locator("#requester-select").selectOption({ label });
  await page.getByRole("button", { name: "Continue" }).click();
}

async function gotoCreate(page: Page) {
  await page.getByRole("button", { name: "Create Ticket" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Create Support Ticket", level: 1 })
  ).toBeVisible();
}

async function fillValidForm(page: Page, summary: string) {
  await page.locator("#category-select").selectOption({ index: 1 });
  await page.locator("#system-select").selectOption({ index: 1 });
  await page.locator("#priority-select").selectOption("MEDIUM");
  await page.locator("#summary-input").fill(summary);
  await page
    .locator("#description-input")
    .fill("Evidence capture ticket for submission screenshots.");
}

async function captureApiEnvelope(
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
  await page.screenshot({ path: path.join(EVIDENCE, outFile) });
  expect(fs.existsSync(path.join(EVIDENCE, outFile))).toBe(true);
}

test("submission evidence captures", async ({ page, request }) => {
  test.setTimeout(240000);
  fs.mkdirSync(EVIDENCE, { recursive: true });
  await page.setViewportSize({ width: 1366, height: 768 });

  // ---- Discover requesters: Anucha (has tickets) + two empty ones ----
  const reqRes = await request.get(`${API}/api/requesters`);
  expect(reqRes.ok()).toBeTruthy();
  const reqJson = await reqRes.json();
  const people: { id: number; name: string; email: string }[] =
    reqJson.requesters ?? reqJson.data ?? reqJson;
  const labelOf = (p: { name: string; email: string }) =>
    `${p.name} (${p.email})`;
  const anucha = people.find((p) => p.name.includes("Anucha"))!;
  const empties: typeof people = [];
  for (const p of people) {
    if (p.id === anucha.id) continue;
    const t = await request.get(`${API}/api/tickets?page=1&pageSize=5`, {
      headers: { "X-Requester-Id": String(p.id) },
    });
    const tj = await t.json();
    if ((tj.tickets ?? tj.data ?? []).length === 0) empties.push(p);
  }
  expect(empties.length).toBeGreaterThanOrEqual(1);
  const requesterB = empties[0];
  const emptyRequester = empties[1] ?? empties[0];

  await page.goto("/");
  await selectRequester(page, labelOf(anucha));
  await gotoCreate(page);

  // ---- 01 validation failure ----
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await expect(page.getByText("Summary is required")).toBeVisible();
  await expect(page.getByText("Category is required")).toBeVisible();
  await page.screenshot({
    path: path.join(EVIDENCE, "01-validation-failure.png"),
  });

  // ---- 04 invalid attachment: EXE type ----
  await page.locator("#file-upload-input").setInputFiles({
    name: "virus.exe",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("malicious-exe"),
  });
  await expect(page.getByTestId("file-errors")).toContainText(
    /unsupported format/i
  );
  await page.screenshot({
    path: path.join(EVIDENCE, "04-invalid-attachment-exe.png"),
  });
  await page.getByRole("button", { name: "Dismiss warning" }).click();

  // ---- 05 invalid attachment: oversize ----
  await page.locator("#file-upload-input").setInputFiles({
    name: "huge-photo.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(6 * 1024 * 1024, 7),
  });
  await expect(page.getByTestId("file-errors")).toContainText(
    /exceeds maximum allowed size/i
  );
  await page.screenshot({
    path: path.join(EVIDENCE, "05-invalid-attachment-oversize.png"),
  });
  await page.getByRole("button", { name: "Dismiss warning" }).click();

  // ---- 02 submitting/busy (delayed POST) then 03 success ----
  const evidenceSummary = `Evidence Ticket - ${Date.now()}`;
  await fillValidForm(page, evidenceSummary);
  const slowPost = async (route: Route) => {
    if (route.request().method() === "POST") {
      await new Promise((r) => setTimeout(r, 2500));
    }
    await route.continue();
  };
  await page.route("**/api/tickets", slowPost);
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await expect(page.getByText("Submitting...")).toBeVisible();
  const submitBtn = page.getByRole("button", { name: /Submitting/ });
  await expect(submitBtn).toBeDisabled();
  await expect(submitBtn).toHaveAttribute("aria-busy", "true");
  await page.screenshot({
    path: path.join(EVIDENCE, "02-submitting-busy.png"),
  });
  await expect(page.getByTestId("success-panel")).toBeVisible({
    timeout: 15000,
  });
  await page.unroute("**/api/tickets", slowPost);
  const ticketNumber = await page
    .getByTestId("success-ticket-number")
    .innerText();
  expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);
  // Element shot: the app smooth-scrolls to top on success, so frame the panel directly
  await page.getByTestId("success-panel").screenshot({
    path: path.join(EVIDENCE, "03-success-ticket-number.png"),
  });

  // ---- 06 backend-down banner, values preserved (aborted POST) ----
  await page.getByRole("button", { name: "+ Create Another Ticket" }).click();
  const draftSummary = "Backend outage draft — must be preserved";
  await fillValidForm(page, draftSummary);
  const abortPost = async (route: Route) => {
    if (route.request().method() === "POST") await route.abort();
    else await route.continue();
  };
  await page.route("**/api/tickets", abortPost);
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await expect(page.getByTestId("api-error-banner")).toBeVisible();
  await expect(page.locator("#summary-input")).toHaveValue(draftSummary);
  // Banner renders at the top of the form; bring it into view before shooting
  await page.getByTestId("api-error-banner").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(EVIDENCE, "06-backend-down-banner-preserved.png"),
  });
  await page.unroute("**/api/tickets", abortPost);

  // ---- 07a A sees the ticket (backend-down draft left behind; use header tab) ----
  await page.getByRole("button", { name: "My Tickets" }).first().click();
  await expect(
    page.getByRole("heading", { name: "My Tickets", level: 1 })
  ).toBeVisible();
  await expect(page.getByText(evidenceSummary).first()).toBeVisible();
  await page.screenshot({
    path: path.join(EVIDENCE, "07a-isolation-A-sees-ticket.png"),
  });

  // ---- 07b B does NOT see A's ticket ----
  await page.getByRole("button", { name: "Change Requester" }).click();
  await selectRequester(page, labelOf(requesterB));
  await expect(
    page.getByRole("heading", { name: "My Tickets", level: 1 })
  ).toBeVisible();
  await expect(page.getByText(evidenceSummary)).toHaveCount(0);
  await page.screenshot({
    path: path.join(EVIDENCE, "07b-isolation-B-sees-nothing.png"),
  });

  // ---- 08 empty state (requester with zero tickets) ----
  if (emptyRequester.id !== requesterB.id) {
    await page.getByRole("button", { name: "Change Requester" }).click();
    await selectRequester(page, labelOf(emptyRequester));
    await expect(
      page.getByRole("heading", { name: "My Tickets", level: 1 })
    ).toBeVisible();
  }
  await expect(page.getByTestId("empty-tickets-state")).toBeVisible();
  await expect(page.getByText("No tickets yet")).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE, "08-empty-state.png") });

  // ---- 09 no-results state (gibberish search as Anucha) ----
  await page.getByRole("button", { name: "Change Requester" }).click();
  await selectRequester(page, labelOf(anucha));
  await expect(
    page.getByRole("heading", { name: "My Tickets", level: 1 })
  ).toBeVisible();
  await page.locator("#ticket-search").fill("zzz-no-such-ticket-zzz");
  await expect(page.getByTestId("no-results-state")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText("No tickets match your filters")).toBeVisible();
  await page.screenshot({
    path: path.join(EVIDENCE, "09-no-results-state.png"),
  });
  await page.locator("#ticket-search").fill("");

  // ---- Resolve the evidence ticket id via API ----
  const listRes = await request.get(
    `${API}/api/tickets?search=${encodeURIComponent(evidenceSummary)}`,
    { headers: { "X-Requester-Id": String(anucha.id) } }
  );
  const listJson = await listRes.json();
  const evidenceTicket = (listJson.tickets ?? listJson.data ?? [])[0];
  expect(evidenceTicket?.id).toBeTruthy();
  const evidenceTicketId: number = evidenceTicket.id;

  // ---- 10 403 cross-access rendered by Ticket Detail ----
  await page.route("**/api/tickets/*", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "FORBIDDEN", message: "Access denied" },
      }),
    })
  );
  await page.getByRole("button", { name: ticketNumber }).first().click();
  await expect(page.getByTestId("ticket-detail-error")).toBeVisible();
  await expect(
    page.getByText(/Access denied. You do not have permission/)
  ).toBeVisible();
  await page.screenshot({
    path: path.join(EVIDENCE, "10-forbidden-403-cross-access.png"),
  });
  await page.unroute("**/api/tickets/*");
  await page.getByTestId("back-to-tickets-error-btn").click();

  // ---- 12 remove dialog + 13 removed row (real lifecycle as owner) ----
  await expect(
    page.getByRole("heading", { name: "My Tickets", level: 1 })
  ).toBeVisible();
  await page.getByRole("button", { name: ticketNumber }).first().click();
  await expect(page.getByTestId("ticket-detail-view")).toBeVisible();
  await page.getByTestId("add-attachment-input").setInputFiles({
    name: "report.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("pdf-sample-evidence-payload"),
  });
  await expect(page.getByText("report.pdf")).toBeVisible();
  await page
    .getByTestId(/^remove-button-/)
    .first()
    .click();
  const modal = page.getByTestId("remove-attachment-dialog");
  await expect(modal).toBeVisible();
  await expect(page.getByTestId("confirm-remove-button")).toBeDisabled();
  await page
    .getByTestId("removal-reason-input")
    .fill("Evidence: superseded version.");
  await expect(page.getByTestId("confirm-remove-button")).toBeEnabled();
  await page.screenshot({ path: path.join(EVIDENCE, "12-remove-dialog.png") });
  await page.getByTestId("confirm-remove-button").click();
  await expect(modal).not.toBeVisible();
  await expect(page.getByTestId(/^removed-badge-/).first()).toBeVisible();
  await expect(page.getByTestId(/^removed-reason-/).first()).toContainText(
    "superseded version"
  );
  await page.screenshot({ path: path.join(EVIDENCE, "13-removed-row.png") });
  const removedBadge = page.getByTestId(/^removed-badge-/).first();
  const removedAttachmentId = (
    await removedBadge.getAttribute("data-testid")
  )?.replace("removed-badge-", "");
  expect(removedAttachmentId).toBeTruthy();

  // ---- 11 live API 403 envelope (B reads A's ticket) ----
  const forbiddenRes = await request.get(
    `${API}/api/tickets/${evidenceTicketId}`,
    {
      headers: { "X-Requester-Id": String(requesterB.id) },
    }
  );
  expect(forbiddenRes.status()).toBe(403);
  await captureApiEnvelope(
    page,
    "403 cross-requester denial — live API envelope",
    `Requester B (${requesterB.name}) reads Requester A ticket #${evidenceTicketId}. Same denial the Ticket Detail renders as "Access denied" (shot 10).`,
    forbiddenRes.status(),
    await forbiddenRes.json(),
    "11-api-403-envelope.png"
  );

  // ---- 14 live API 410 envelope (re-download removed attachment) ----
  const goneRes = await request.get(
    `${API}/api/attachments/${removedAttachmentId}/download`,
    { headers: { "X-Requester-Id": String(anucha.id) } }
  );
  expect(goneRes.status()).toBe(410);
  await captureApiEnvelope(
    page,
    "410 removed attachment re-download blocked — live API envelope",
    `Re-download of soft-removed attachment #${removedAttachmentId} (reason recorded, row disabled — shot 13).`,
    goneRes.status(),
    await goneRes.json(),
    "14-api-410-envelope.png"
  );
});
