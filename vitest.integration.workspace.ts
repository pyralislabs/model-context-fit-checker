import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "integration",
    include: ["**/*.integration.test.ts"],
    projects: ["packages/core", "packages/vram-engine", "apps/cli", "apps/web"],
  },
});
