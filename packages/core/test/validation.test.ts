import { describe, it, expect } from "vitest";
import { validateAndNormalizeRequest } from "../src/validate.js";
import { ContextFitRequestV1Schema } from "../src/contracts.js";
import { SolverError } from "../src/errors.js";

describe("ContextFitRequestV1Schema", () => {
  it("accepts a minimal valid request with defaults", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 12,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.headroomPercent).toBe(10);
      expect(result.data.minContextTokens).toBe(1);
      expect(result.data.contextGranularity).toBe(1);
    }
  });

  it("accepts a full valid request", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 24,
      headroomPercent: 5,
      minContextTokens: 1024,
      maxContextTokens: 128000,
      contextGranularity: 128,
      runtimeProfile: "balanced",
      kvCacheDtype: "fp16",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown keys", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 12,
      extraField: "unknown",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing schemaVersion", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 12,
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong schemaVersion", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "2",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 12,
    });
    expect(result.success).toBe(false);
  });

  it("rejects blank model", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "",
      quantization: "q4_k_m",
      gpuVramGiB: 12,
    });
    expect(result.success).toBe(false);
  });

  it("rejects blank quantization", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "",
      gpuVramGiB: 12,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive gpuVramGiB", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative gpuVramGiB", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: -12,
    });
    expect(result.success).toBe(false);
  });

  it("rejects NaN", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: NaN,
    });
    expect(result.success).toBe(false);
  });

  it("rejects Infinity", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: Infinity,
    });
    expect(result.success).toBe(false);
  });

  it("rejects numeric strings in JSON input", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: "12",
    });
    expect(result.success).toBe(false);
  });

  it("rejects headroom below 0", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 12,
      headroomPercent: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects headroom above 50", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 12,
      headroomPercent: 51,
    });
    expect(result.success).toBe(false);
  });

  it("accepts headroom at boundaries 0 and 50", () => {
    const r0 = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 12,
      headroomPercent: 0,
    });
    expect(r0.success).toBe(true);

    const r50 = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 12,
      headroomPercent: 50,
    });
    expect(r50.success).toBe(true);
  });

  it("rejects zero minContextTokens", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 12,
      minContextTokens: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative minContextTokens", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 12,
      minContextTokens: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer contextGranularity", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 12,
      contextGranularity: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects maxContextTokens below minContextTokens", () => {
    const result = ContextFitRequestV1Schema.safeParse({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 12,
      minContextTokens: 10000,
      maxContextTokens: 1000,
    });
    expect(result.success).toBe(false);
  });
});

describe("validateAndNormalizeRequest", () => {
  it("throws for unsupported schema version", () => {
    expect(() =>
      validateAndNormalizeRequest({
        schemaVersion: "2",
        model: "llama-3.1-8b",
        quantization: "q4_k_m",
        gpuVramGiB: 12,
      }),
    ).toThrow(SolverError);
  });

  it("throws for invalid input with issues", () => {
    expect(() =>
      validateAndNormalizeRequest({
        schemaVersion: "1",
        model: "",
        quantization: "q4_k_m",
        gpuVramGiB: 12,
      }),
    ).toThrow(SolverError);
  });

  it("returns normalized input for valid request", () => {
    const result = validateAndNormalizeRequest({
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 12,
    });
    expect(result.schemaVersion).toBe("1");
    expect(result.model).toBe("llama-3.1-8b");
    expect(result.headroomPercent).toBe(10);
    expect(result.minContextTokens).toBe(1);
    expect(result.contextGranularity).toBe(1);
  });
});
