import { describe, it, expect } from "vitest";
import { clearResult, renderLoading, renderError, renderResult } from "../src/render.js";
import type {
  ContextFitResultV1,
  NormalizedContextFitInputV1,
} from "@localairigs/model-context-fit-core";

function createDiv(): HTMLElement {
  const div = document.createElement("div");
  div.hidden = true;
  return div;
}

const sampleInput: NormalizedContextFitInputV1 = {
  schemaVersion: "1",
  model: "llama-3.1-8b",
  quantization: "q4_k_m",
  gpuVramGiB: 24,
  headroomPercent: 10,
  minContextTokens: 1,
  contextGranularity: 1,
};

function makeFitResult(overrides?: Partial<ContextFitResultV1>): ContextFitResultV1 {
  return {
    schemaVersion: "1",
    status: "fits",
    input: sampleInput,
    budget: {
      totalVramBytes: 25769803776,
      totalVramGiB: 24,
      headroomPercent: 10,
      usableVramBytes: 23192823398,
      usableVramGiB: 21.6,
    },
    search: {
      requestedMinContextTokens: 1,
      requestedMaxContextTokens: null,
      modelMaxContextTokens: 131072,
      rawUpperBoundTokens: 131072,
      alignedMinContextTokens: 1,
      alignedMaxContextTokens: 131072,
      granularity: 1,
    },
    provider: {
      packageName: "@localairigs/model-context-fit-vram-engine",
      packageVersion: "0.1.0",
      assumptionVersion: "1.0.0",
      datasetVersion: "1.0.0",
    },
    warnings: [],
    result: {
      maxContextTokens: 131072,
      estimate: {
        contextTokens: 131072,
        requiredVramBytes: 15000000000,
        requiredVramGiB: 13.97,
        remainingUsableVramBytes: 8192823398,
        remainingUsableVramGiB: 7.63,
        breakdownBytes: {
          weights: 5000000000,
          kvCache: 5000000000,
          runtimeFixed: 2000000000,
          computeBuffer: 2000000000,
          safetyMargin: 1000000000,
        },
        assumptions: ["Weights loaded in full"],
        warnings: [],
      },
    },
    boundary: {
      kind: "model_limit",
      nextContextTokens: null,
      nextEstimate: null,
    },
    ...overrides,
  } as ContextFitResultV1;
}

function makeNoFitResult(): ContextFitResultV1 {
  return {
    schemaVersion: "1",
    status: "minimum_context_does_not_fit",
    input: sampleInput,
    budget: {
      totalVramBytes: 1073741824,
      totalVramGiB: 1,
      headroomPercent: 10,
      usableVramBytes: 966367641,
      usableVramGiB: 0.9,
    },
    search: {
      requestedMinContextTokens: 1,
      requestedMaxContextTokens: null,
      modelMaxContextTokens: 131072,
      rawUpperBoundTokens: 131072,
      alignedMinContextTokens: 1,
      alignedMaxContextTokens: 131072,
      granularity: 1,
    },
    provider: {
      packageName: "@localairigs/model-context-fit-vram-engine",
      packageVersion: "0.1.0",
      assumptionVersion: "1.0.0",
      datasetVersion: "1.0.0",
    },
    warnings: [],
    result: { maxContextTokens: null, estimate: null },
    boundary: {
      kind: "minimum_context",
      contextTokens: 1,
      estimate: {
        contextTokens: 1,
        requiredVramBytes: 5000000000,
        requiredVramGiB: 4.66,
        remainingUsableVramBytes: -4033632359,
        remainingUsableVramGiB: -3.76,
        breakdownBytes: {
          weights: 4000000000,
          kvCache: 1000000,
          runtimeFixed: 500000000,
          computeBuffer: 500000000,
          safetyMargin: 0,
        },
        assumptions: ["Weights loaded in full"],
        warnings: [],
      },
    },
  };
}

describe("clearResult", () => {
  it("clears and hides result div", () => {
    const resultDiv = createDiv();
    resultDiv.textContent = "old content";
    resultDiv.hidden = false;

    clearResult(resultDiv, null);

    expect(resultDiv.hidden).toBe(true);
    expect(resultDiv.childNodes.length).toBe(0);
  });

  it("clears and hides error div", () => {
    const errorDiv = createDiv();
    errorDiv.textContent = "old error";
    errorDiv.hidden = false;

    clearResult(null, errorDiv);

    expect(errorDiv.hidden).toBe(true);
    expect(errorDiv.childNodes.length).toBe(0);
  });

  it("handles null elements", () => {
    expect(() => clearResult(null, null)).not.toThrow();
  });
});

describe("renderLoading", () => {
  it("shows loading text in result div", () => {
    const div = createDiv();
    renderLoading(div);
    expect(div.hidden).toBe(false);
    expect(div.textContent).toBe("Calculating...");
  });

  it("handles null element", () => {
    expect(() => renderLoading(null)).not.toThrow();
  });
});

describe("renderError", () => {
  it("shows error message", () => {
    const errorDiv = createDiv();
    renderError(errorDiv, "Test error message");

    expect(errorDiv.hidden).toBe(false);
    expect(errorDiv.textContent).toContain("Test error message");
  });

  it("handles null element", () => {
    expect(() => renderError(null, "error")).not.toThrow();
  });
});

describe("renderResult", () => {
  it("renders fits result with model_limit boundary", () => {
    const resultDiv = createDiv();
    const result = makeFitResult();

    renderResult(resultDiv, result, sampleInput);

    expect(resultDiv.hidden).toBe(false);
    expect(resultDiv.textContent).toContain("131,072");
    expect(resultDiv.textContent).toContain("Model limit reached");
    expect(resultDiv.textContent).toContain("Assumptions");
    expect(resultDiv.textContent).toContain("Weights loaded in full");
    expect(resultDiv.textContent).toContain("Assumption version");
    expect(resultDiv.textContent).toContain("1.0.0");
    expect(resultDiv.textContent).toContain("Dataset version");
  });

  it("renders fits result with VRAM boundary", () => {
    const resultDiv = createDiv();
    const result = makeFitResult({
      boundary: {
        kind: "vram",
        nextContextTokens: 100,
        nextEstimate: {
          contextTokens: 100,
          requiredVramBytes: 99999999999,
          requiredVramGiB: 93.13,
          remainingUsableVramBytes: -76807167601,
          remainingUsableVramGiB: -71.53,
          breakdownBytes: {
            weights: 0,
            kvCache: 0,
            runtimeFixed: 0,
            computeBuffer: 0,
            safetyMargin: 0,
          },
          assumptions: [],
          warnings: [],
        },
      },
    });

    renderResult(resultDiv, result, sampleInput);

    expect(resultDiv.textContent).toContain("Boundary");
    expect(resultDiv.textContent).toContain("exceeding");
  });

  it("renders no-fit result", () => {
    const resultDiv = createDiv();
    const result = makeNoFitResult();

    renderResult(resultDiv, result, sampleInput);

    expect(resultDiv.textContent).toContain("Minimum context");
    expect(resultDiv.textContent).toContain("does not fit");
  });

  it("renders warnings section when warnings exist", () => {
    const resultDiv = createDiv();
    const result = makeFitResult({
      warnings: ["This is a test warning", "Another warning"],
    });

    renderResult(resultDiv, result, sampleInput);

    expect(resultDiv.textContent).toContain("Warnings");
    expect(resultDiv.textContent).toContain("This is a test warning");
    expect(resultDiv.textContent).toContain("Another warning");
  });

  it("handles null element", () => {
    expect(() => renderResult(null, makeFitResult(), sampleInput)).not.toThrow();
  });
});
