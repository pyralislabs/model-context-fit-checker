import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/core",
  "packages/vram-engine",
  "apps/cli",
  "apps/web",
]);
