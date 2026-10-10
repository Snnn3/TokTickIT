import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/lab-04/dashboard-performance.integration.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
});
