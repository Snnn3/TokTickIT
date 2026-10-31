import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Role } from "../../client/src/types/auth";
import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

type EvidenceTestId = "E4-01" | "E4-02" | "E4-03" | "E4-04" | "E4-05";

export async function captureEvidence(
  page: Page,
  testInfo: TestInfo,
  folder: "actions-taken" | "ticket-workflow" | "user-management",
  name: string,
  testId: EvidenceTestId,
  role: Role,
  expectedResult: string,
  scrollTarget?: Locator
) {
  const directory = join("artifacts", "lab-04", "screenshots", folder);
  mkdirSync(directory, { recursive: true });
  if (scrollTarget) {
    await expect(scrollTarget).toBeVisible();
    await scrollTarget.scrollIntoViewIfNeeded();
  }
  await page.screenshot({
    path: join(directory, `${name}.png`),
  });
  writeFileSync(
    join(directory, `${name}.json`),
    `${JSON.stringify(
      {
        testId,
        test: testInfo.title,
        screenshot: `${name}.png`,
        role,
        route: new URL(page.url()).pathname,
        viewport: page.viewportSize(),
        fullPage: false,
        capturedAt: new Date().toISOString(),
        expectedResult,
      },
      null,
      2
    )}\n`
  );
}
