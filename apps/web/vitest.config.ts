import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "apps/web",
    environment: "happy-dom",
    include: ["test/**/*.test.ts"],
    coverage: {
      thresholds: {
        statements: 60,
        branches: 40,
        functions: 40,
        lines: 60,
      },
    },
  },
});
