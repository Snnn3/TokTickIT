import { resolve } from "node:path";
import { runWithDashboardDatabase } from "../../server/tests/helpers/run-isolated";

async function main() {
  process.exitCode = await runWithDashboardDatabase(
    resolve("node_modules/@playwright/test/cli.js"),
    ["test", "--config", "playwright.config.ts", "e2e/lab-02", "e2e/lab-03"]
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
