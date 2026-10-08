import { resolve } from "node:path";
import { runWithDashboardDatabase } from "../../server/tests/helpers/run-isolated";

async function main() {
  process.exitCode = await runWithDashboardDatabase(
    resolve("node_modules/@playwright/test/cli.js"),
    [
      "test",
      "--config",
      "playwright.dashboard.config.ts",
      ...process.argv.slice(2),
    ]
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
