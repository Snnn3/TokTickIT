import { resolve } from "node:path";
import { runWithDashboardDatabase } from "./helpers/run-isolated";

async function main() {
  process.exitCode = await runWithDashboardDatabase(
    resolve("node_modules/vitest/vitest.mjs"),
    ["run", ...process.argv.slice(2)]
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
