import { describe, it, expect } from "vitest";
import {
  alignUp,
  alignDown,
  computeUsableVram,
  computeAlignedBounds,
  solveContextFit,
} from "../src/solve.js";
import { MonotoneProvider } from "./fixtures/monotone-provider.js";
import { SolverError } from "../src/errors.js";
import { ONE_GIB } from "../src/contracts.js";

describe("alignUp", () => {
  it("aligns up correctly", () => {
    expect(alignUp(0, 128)).toBe(0);
    expect(alignUp(1, 128)).toBe(128);
    expect(alignUp(128, 128)).toBe(128);
    expect(alignUp(129, 128)).toBe(256);
  });

  it("handles granularity of 1", () => {
    expect(alignUp(42, 1)).toBe(42);
  });

  it("throws for non-safe integers", () => {
    expect(() => alignUp(1.5, 1)).toThrow(SolverError);
    expect(() => alignUp(1, 1.5)).toThrow(SolverError);
  });

  it("throws for non-positive granularity", () => {
    expect(() => alignUp(1, 0)).toThrow(SolverError);
    expect(() => alignUp(1, -1)).toThrow(SolverError);
  });
});

describe("alignDown", () => {
  it("aligns down correctly", () => {
    expect(alignDown(0, 128)).toBe(0);
    expect(alignDown(1, 128)).toBe(0);
    expect(alignDown(128, 128)).toBe(128);
    expect(alignDown(129, 128)).toBe(128);
  });

  it("handles granularity of 1", () => {
    expect(alignDown(42, 1)).toBe(42);
  });
});

describe("computeUsableVram", () => {
  it("converts GiB to bytes and applies headroom", () => {
    const result = computeUsableVram(12, 10);
    expect(result.totalVramBytes).toBe(12 * ONE_GIB);
    expect(result.usableVramBytes).toBe(Math.floor(12 * ONE_GIB * 0.9));
  });

  it("zero headroom gives usable == total", () => {
    const result = computeUsableVram(12, 0);
    expect(result.usableVramBytes).toBe(result.totalVramBytes);
  });

  it("50% headroom halves usable", () => {
    const result = computeUsableVram(12, 50);
    expect(result.usableVramBytes).toBe(Math.floor(12 * ONE_GIB * 0.5));
  });
});

describe("computeAlignedBounds", () => {
  it("produces correct bounds for simple case", () => {
    const bounds = computeAlignedBounds(1, undefined, 131072, 1);
    expect(bounds.alignedMin).toBe(1);
    expect(bounds.alignedMax).toBe(131072);
    expect(bounds.candidateCount).toBe(131072);
  });

  it("caps at model max when no caller cap", () => {
    const bounds = computeAlignedBounds(1, undefined, 4096, 1);
    expect(bounds.alignedMax).toBe(4096);
  });

  it("uses caller cap when lower", () => {
    const bounds = computeAlignedBounds(1, 2048, 4096, 1);
    expect(bounds.alignedMax).toBe(2048);
  });

  it("throws on empty aligned range", () => {
    expect(() => computeAlignedBounds(100, 50, 4096, 1)).toThrow(SolverError);
  });

  it("handles granularity larger than range", () => {
    expect(() => computeAlignedBounds(1, 100, 4096, 4096)).toThrow(SolverError);
  });

  it("granularity larger than range produces no aligned candidates", () => {
    expect(() => computeAlignedBounds(1, 100, 4096, 4096)).toThrow(
      "No aligned context exists",
    );
  });

  it("handles non-divisible bounds", () => {
    const bounds = computeAlignedBounds(1, 100, 4096, 64);
    expect(bounds.alignedMin).toBe(64);
    expect(bounds.alignedMax).toBe(64);
    expect(bounds.candidateCount).toBe(1);
  });
});

describe("solveContextFit", () => {
  async function solve(
    opts: {
      vramGiB?: number;
      modelMax?: number;
      granularity?: number;
      baseVram?: number;
      perToken?: number;
      headroom?: number;
      minContext?: number;
      maxContext?: number;
    } = {},
  ) {
    const provider = new MonotoneProvider({
      modelMaxContextTokens: opts.modelMax ?? 8192,
      baseVramBytes: opts.baseVram ?? 4 * ONE_GIB,
      bytesPerToken: opts.perToken ?? 100_000,
    });
    return solveContextFit(provider, {
      schemaVersion: "1",
      model: "test-model",
      quantization: "q4_k_m",
      gpuVramGiB: opts.vramGiB ?? 12,
      headroomPercent: opts.headroom ?? 10,
      minContextTokens: opts.minContext ?? 1,
      maxContextTokens: opts.maxContext,
      contextGranularity: opts.granularity ?? 1,
    });
  }

  it("returns fits when min context fits", async () => {
    const result = await solve({ vramGiB: 24 });
    expect(result.status).toBe("fits");
    if (result.status === "fits") {
      expect(result.result.maxContextTokens).toBeGreaterThan(0);
    }
  });

  it("returns minimum_context_does_not_fit when budget is too small", async () => {
    const result = await solve({
      vramGiB: 1,
      baseVram: 2 * ONE_GIB,
      perToken: 0,
    });
    expect(result.status).toBe("minimum_context_does_not_fit");
    if (result.status === "minimum_context_does_not_fit") {
      expect(result.boundary.estimate.remainingUsableVramBytes).toBeLessThan(0);
    }
  });

  it("correctly caps at model limit", async () => {
    const result = await solve({
      vramGiB: 9999,
      modelMax: 4096,
      baseVram: ONE_GIB,
      perToken: 1,
    });
    expect(result.status).toBe("fits");
    if (result.status === "fits") {
      expect(result.result.maxContextTokens).toBe(4096);
      expect(result.boundary.kind).toBe("model_limit");
    }
  });

  it("correctly caps at caller limit", async () => {
    const result = await solve({
      vramGiB: 9999,
      modelMax: 131072,
      maxContext: 4096,
      baseVram: ONE_GIB,
      perToken: 1,
    });
    expect(result.status).toBe("fits");
    if (result.status === "fits") {
      expect(result.result.maxContextTokens).toBe(4096);
      expect(result.boundary.kind).toBe("caller_limit");
    }
  });

  it("returns VRAM-limited result with boundary evidence", async () => {
    const result = await solve({
      vramGiB: 10,
      modelMax: 64,
      baseVram: 6 * ONE_GIB,
      perToken: 100_000_000,
      headroom: 0,
    });
    expect(result.status).toBe("fits");
    if (result.status === "fits") {
      expect(result.boundary.kind).toBe("vram");
      if (result.boundary.kind === "vram") {
        expect(result.boundary.nextContextTokens).toBeGreaterThan(
          result.result.maxContextTokens,
        );
        expect(result.boundary.nextEstimate.remainingUsableVramBytes).toBeLessThan(0);
      }
    }
  });

  it("guards against provider non-monotonicity", async () => {
    const overrides = new Map<
      number,
      Partial<import("../src/contracts.js").ForwardEstimate>
    >();
    overrides.set(9, { requiredVramBytes: 1 });
    const provider = new MonotoneProvider({
      modelMaxContextTokens: 16,
      baseVramBytes: 0,
      bytesPerToken: 100_000_000,
      estimateOverrides: overrides,
    });

    await expect(
      solveContextFit(provider, {
        schemaVersion: "1",
        model: "test-model",
        quantization: "q4_k_m",
        gpuVramGiB: 0.5,
        headroomPercent: 0,
        minContextTokens: 1,
        contextGranularity: 1,
      }),
    ).rejects.toThrow(SolverError);
  });

  it("guards against provider throwing", async () => {
    const provider = new MonotoneProvider({ throwOnEstimate: true });
    await expect(
      solveContextFit(provider, {
        schemaVersion: "1",
        model: "test-model",
        quantization: "q4_k_m",
        gpuVramGiB: 12,
        headroomPercent: 10,
        minContextTokens: 1,
        contextGranularity: 1,
      }),
    ).rejects.toThrow(SolverError);
  });

  it("guards against provider resolve throwing", async () => {
    const provider = new MonotoneProvider({ throwOnResolve: true });
    await expect(
      solveContextFit(provider, {
        schemaVersion: "1",
        model: "test-model",
        quantization: "q4_k_m",
        gpuVramGiB: 12,
        headroomPercent: 10,
        minContextTokens: 1,
        contextGranularity: 1,
      }),
    ).rejects.toThrow(SolverError);
  });

  it("one-candidate domain works", async () => {
    const result = await solve({
      vramGiB: 24,
      modelMax: 131072,
      baseVram: ONE_GIB,
      perToken: 1,
      minContext: 4096,
      maxContext: 4096,
      granularity: 1,
    });
    expect(result.status).toBe("fits");
  });

  it("two-candidate domain works", async () => {
    const result = await solve({
      vramGiB: 12,
      modelMax: 8192,
      baseVram: 8 * ONE_GIB,
      perToken: 1_000_000,
      headroom: 0,
      minContext: 4096,
      maxContext: 8192,
      granularity: 4096,
    });
    expect(result.status).toBe("fits");
    if (result.status === "fits") {
      expect(result.result.maxContextTokens).toBeGreaterThan(0);
    }
  });

  it("one-candidate domain with exact fit", async () => {
    const result = await solve({
      vramGiB: 12,
      modelMax: 4096,
      baseVram: 8 * ONE_GIB,
      perToken: 1_000_000,
      headroom: 0,
      minContext: 4096,
      maxContext: 4096,
      granularity: 1,
    });
    expect(result.status).toBe("fits");
    if (result.status === "fits") {
      expect(result.result.maxContextTokens).toBe(4096);
    }
  });
});
