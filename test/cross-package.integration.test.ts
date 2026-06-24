import { describe, it, expect } from "vitest";
import {
  validateAndNormalizeRequest,
  solveContextFit,
  NormalizedContextFitInputV1Schema,
  ResolvedMathConfigurationSchema,
  ForwardEstimateSchema,
  ContextFitResultV1Schema,
} from "@localairigs/model-context-fit-core";
import {
  StandaloneVramProvider,
  estimateRequiredVram,
} from "@localairigs/model-context-fit-vram-engine";

const provider = new StandaloneVramProvider();

describe("cross-package: core → vram-engine contract", () => {
  it("vram-engine estimate is compatible with ForwardEstimateSchema", () => {
    const estimate = estimateRequiredVram({
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      contextTokens: 1024,
    });
    const parsed = ForwardEstimateSchema.safeParse({
      contextTokens: estimate.contextTokens,
      requiredVramBytes: estimate.requiredVramBytes,
      breakdownBytes: estimate.breakdownBytes,
      assumptions: estimate.assumptions,
      warnings: estimate.warnings,
      provider: estimate.metadata,
    });
    expect(parsed.success).toBe(true);
  });

  it("provider resolveConfiguration is compatible with ResolvedMathConfigurationSchema", () => {
    const config = provider.resolveConfiguration({
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
    });
    const parsed = ResolvedMathConfigurationSchema.safeParse(config);
    expect(parsed.success).toBe(true);
  });
});

describe("cross-package: end-to-end solve flow", () => {
  it("validateAndNormalizeRequest → solveContextFit → valid result", async () => {
    const raw = {
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 24,
    };
    const normalized = validateAndNormalizeRequest(raw);
    const parsedInput = NormalizedContextFitInputV1Schema.safeParse(normalized);
    expect(parsedInput.success).toBe(true);

    const result = await solveContextFit(provider, normalized);
    const parsedResult = ContextFitResultV1Schema.safeParse(result);
    expect(parsedResult.success).toBe(true);
    expect(result.schemaVersion).toBe("1");
  });

  it("small VRAM produces minimum_context_does_not_fit", async () => {
    const raw = {
      schemaVersion: "1",
      model: "llama-3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 0.1,
      headroomPercent: 0,
    };
    const normalized = validateAndNormalizeRequest(raw);
    const result = await solveContextFit(provider, normalized);
    expect(result.status).toBe("minimum_context_does_not_fit");
  });

  it("canonical IDs from provider are reflected in result", async () => {
    const raw = {
      schemaVersion: "1",
      model: "llama3.1-8b",
      quantization: "q4_k_m",
      gpuVramGiB: 24,
    };
    const normalized = validateAndNormalizeRequest(raw);
    const result = await solveContextFit(provider, normalized);
    expect(result.input.model).toBe("llama-3.1-8b");
  });
});
