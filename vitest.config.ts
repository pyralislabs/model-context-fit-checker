import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "**/scripts/**",
        "**/node_modules/**",
        "**/dist/**",
        "**/coverage/**",
        "**/*.config.*",
        "**/*.d.ts",
        "**/generated/**",
        "**/test/**",
        "**/tests/**",
      ],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 40,
        lines: 60,
      },
    },
    projects: ["packages/core", "packages/vram-engine", "apps/cli", "apps/web"],
  },
});
