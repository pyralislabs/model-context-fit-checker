import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "apps/cli",
    coverage: {
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 30,
        lines: 50,
      },
    },
  },
});
