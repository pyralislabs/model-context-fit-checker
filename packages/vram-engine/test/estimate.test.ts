import { describe, it, expect } from "vitest";
import { estimateRequiredVram } from "../src/estimate.js";

describe("estimateRequiredVram", () => {
  it("returns a valid estimate for known model with defaults", () => {
    const result = estimateRequiredVram({
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      contextTokens: 1,
    });
    expect(result.contextTokens).toBe(1);
    expect(Number.isSafeInteger(result.requiredVramBytes)).toBe(true);
    expect(result.requiredVramBytes).toBeGreaterThan(0);
    expect(Object.keys(result.breakdownBytes)).toEqual([
      "weights", "kvCache", "runtimeFixed", "computeBuffer", "safetyMargin",
    ]);
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.metadata.packageName).toBeTruthy();
    expect(result.metadata.packageVersion).toBeTruthy();
    expect(result.metadata.assumptionVersion).toBeTruthy();
    expect(result.metadata.datasetVersion).toBeTruthy();
  });

  it("produces deterministic results (deep equal on repeat)", () => {
    const request = {
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      contextTokens: 1024,
    };
    const a = estimateRequiredVram(request);
    const b = estimateRequiredVram(request);
    expect(a).toEqual(b);
  });

  it("increasing context increases KV-cache bytes", () => {
    const low = estimateRequiredVram({
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      contextTokens: 1,
    });
    const high = estimateRequiredVram({
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      contextTokens: 4096,
    });
    expect(high.breakdownBytes.kvCache).toBeGreaterThan(low.breakdownBytes.kvCache);
  });

  it("throws for unknown model", () => {
    expect(() =>
      estimateRequiredVram({
        model: "nonexistent-model",
        quantization: "q4_k_m",
        contextTokens: 1,
      }),
    ).toThrow();
  });

  it("throws for unknown quantization", () => {
    expect(() =>
      estimateRequiredVram({
        model: "llama-3.1-8b",
        quantization: "nonexistent-quant",
        contextTokens: 1,
      }),
    ).toThrow();
  });

  it("works with all runtime profiles", () => {
    for (const profile of ["lean", "balanced", "conservative"] as const) {
      const result = estimateRequiredVram({
        model: "llama-3.1-8b",
        quantization: "q4_k_m",
        contextTokens: 1024,
        runtimeProfile: profile,
      });
      expect(result.requiredVramBytes).toBeGreaterThan(0);
    }
  });

  it("works with all KV cache dtypes", () => {
    for (const dtype of ["fp16", "bf16", "fp32", "q8_0", "q4_0"] as const) {
      const result = estimateRequiredVram({
        model: "llama-3.1-8b",
        quantization: "q4_k_m",
        contextTokens: 1024,
        kvCacheDtype: dtype,
      });
      expect(result.requiredVramBytes).toBeGreaterThan(0);
    }
  });

  it("emits warning for idealized KV dtypes", () => {
    const result = estimateRequiredVram({
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      contextTokens: 1024,
      kvCacheDtype: "q8_0",
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]!.toLowerCase()).toContain("idealized");
  });

  it("does not warn for non-idealized KV dtypes", () => {
    const result = estimateRequiredVram({
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      contextTokens: 1024,
      kvCacheDtype: "fp16",
    });
    expect(result.warnings).toEqual([]);
  });

  it("handles max context for a known model", () => {
    const result = estimateRequiredVram({
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      contextTokens: 131072,
    });
    expect(result.requiredVramBytes).toBeGreaterThan(0);
    expect(Number.isSafeInteger(result.requiredVramBytes)).toBe(true);
  });
});
