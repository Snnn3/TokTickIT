import { spawn } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { seedDashboardAccounts } from "./dashboard-fixtures";
import { createDisposableDatabase } from "./disposable-database";

/** Shared lifecycle for the browser and full-regression disposable runners. */
export async function runWithDashboardDatabase(cli: string, args: string[]) {
  const database = await createDisposableDatabase();
  process.env.DATABASE_URL = database.url;
  process.env.TOKTICKIT_DISPOSABLE_DATABASE_URL = database.url;
  process.env.JWT_SECRET = "isolated-dashboard-test-only";
  const db = new PrismaClient({ datasourceUrl: database.url });
  try {
    await seedDashboardAccounts(db);
    await db.$disconnect();
    const child = spawn(process.execPath, [cli, ...args], {
      env: process.env,
      stdio: "inherit",
      windowsHide: true,
    });
    return await new Promise<number>((resolveExit, reject) => {
      child.once("error", reject);
      child.once("exit", (code) => resolveExit(code ?? 1));
    });
  } finally {
    await db.$disconnect();
    database.dispose();
  }
}
