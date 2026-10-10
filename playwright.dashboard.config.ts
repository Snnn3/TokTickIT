import { defineConfig, devices } from "@playwright/test";
import { requireDisposableDatabase } from "./server/tests/helpers/disposable-database";

const databaseUrl = requireDisposableDatabase();
export default defineConfig({
  testDir: "./e2e/lab-04",
  testMatch: "dashboards.spec.ts",
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:5184", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev --prefix server",
      url: "http://127.0.0.1:3104/api/health",
      reuseExistingServer: false,
      env: {
        DATABASE_URL: databaseUrl,
        PORT: "3104",
        JWT_SECRET: process.env.JWT_SECRET!,
      },
      timeout: 30000,
    },
    {
      command:
        "npm run dev --prefix client -- --host 127.0.0.1 --port 5184 --strictPort",
      url: "http://127.0.0.1:5184",
      reuseExistingServer: false,
      env: { TOKTICKIT_TEST_API_TARGET: "http://127.0.0.1:3104" },
      timeout: 30000,
    },
  ],
});
