import { describe, it, expect } from "vitest";
import { StandaloneVramProvider } from "../src/standalone-vram-provider.js";

const provider = new StandaloneVramProvider();

describe("StandaloneVramProvider", () => {
  it("has correct package metadata", () => {
    expect(provider.packageName).toContain("vram-engine");
    expect(provider.packageVersion).toBeTruthy();
    expect(provider.assumptionVersion).toBeTruthy();
    expect(provider.datasetVersion).toBeTruthy();
  });

  it("resolves known model configuration", () => {
    const config = provider.resolveConfiguration({
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
    });
    expect(config.model).toBe("llama-3.1-8b");
    expect(config.modelMaxContextTokens).toBe(131072);
    expect(config.units).toBe("bytes");
    expect(config.provider.packageName).toContain("vram-engine");
  });

  it("resolves aliases to canonical ID", () => {
    const config = provider.resolveConfiguration({
      model: "llama3.1-8b",
      quantization: "q4_k_m",
    });
    expect(config.model).toBe("llama-3.1-8b");
  });

  it("returns forward estimate", () => {
    const config = provider.resolveConfiguration({
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
    });
    const estimate = provider.estimateRequiredVram({
      ...config,
      contextTokens: 1024,
    });
    expect(estimate.contextTokens).toBe(1024);
    expect(estimate.requiredVramBytes).toBeGreaterThan(0);
    expect(estimate.breakdownBytes).toHaveProperty("weights");
    expect(estimate.breakdownBytes).toHaveProperty("kvCache");
    expect(estimate.assumptions.length).toBeGreaterThan(0);
  });

  it("throws for unknown model", () => {
    expect(() => {
      provider.resolveConfiguration({
        model: "nonexistent-model",
        quantization: "q4_k_m",
      });
    }).toThrow();
  });

  it("throws for unknown quantization", () => {
    expect(() => {
      provider.resolveConfiguration({
        model: "llama-3.1-8b",
        quantization: "nonexistent-quant",
      });
    }).toThrow();
  });

  it("estimates are monotonic with increasing context", () => {
    const config = provider.resolveConfiguration({
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
    });
    const e1 = provider.estimateRequiredVram({ ...config, contextTokens: 1 });
    const e2 = provider.estimateRequiredVram({ ...config, contextTokens: 4096 });
    expect(e2.requiredVramBytes).toBeGreaterThanOrEqual(e1.requiredVramBytes);
  });
});
