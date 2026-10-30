import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/lab-04/concurrency.integration.test.ts"],
    maxWorkers: 1,
    fileParallelism: false,
  },
});
