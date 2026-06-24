import { describe, it, expect } from "vitest";

describe("vram-engine package exports", () => {
  it("exports expected public API", async () => {
    const engine = await import("../src/index.js");
    expect(engine).toHaveProperty("estimateRequiredVram");
    expect(engine).toHaveProperty("resolveModel");
    expect(engine).toHaveProperty("listModels");
    expect(engine).toHaveProperty("listQuantizations");
    expect(engine).toHaveProperty("listRuntimeProfiles");
    expect(engine).toHaveProperty("listKvCacheDtypes");
    expect(engine).toHaveProperty("StandaloneVramProvider");
    expect(engine).toHaveProperty("StandaloneForwardRequestSchema");
    expect(engine).toHaveProperty("StandaloneForwardEstimateSchema");
    expect(engine).toHaveProperty("ENGINE_VERSION");
  });
});
