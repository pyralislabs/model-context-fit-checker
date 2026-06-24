import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "packages/core",
    coverage: {
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 70,
        lines: 80,
      },
    },
  },
});
