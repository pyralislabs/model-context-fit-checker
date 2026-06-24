import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "packages/vram-engine",
    coverage: {
      thresholds: {
        statements: 80,
        branches: 60,
        functions: 60,
        lines: 80,
      },
    },
  },
});
