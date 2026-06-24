import { describe, it, expect } from "vitest";
import {
  solveContextFit,
  computeUsableVram,
  computeAlignedBounds,
} from "../src/solve.js";
import type { NormalizedContextFitInputV1 } from "../src/contracts.js";
import { MonotoneProvider } from "./fixtures/monotone-provider.js";
import { ONE_GIB } from "../src/contracts.js";

interface Seed {
  base: number;
  perToken: number;
  modelMax: number;
  vramGiB: number;
  headroom: number;
  granularity: number;
  minContext: number;
  maxContext?: number;
}

const seeds: Seed[] = [
  {
    base: 2 * ONE_GIB,
    perToken: 100_000,
    modelMax: 64,
    vramGiB: 6,
    headroom: 10,
    granularity: 1,
    minContext: 1,
  },
  {
    base: ONE_GIB,
    perToken: 200_000,
    modelMax: 64,
    vramGiB: 12,
    headroom: 5,
    granularity: 8,
    minContext: 1,
  },
  {
    base: 4 * ONE_GIB,
    perToken: 50_000,
    modelMax: 128,
    vramGiB: 16,
    headroom: 0,
    granularity: 16,
    minContext: 1,
  },
  {
    base: 8 * ONE_GIB,
    perToken: 300_000,
    modelMax: 128,
    vramGiB: 24,
    headroom: 20,
    granularity: 1,
    minContext: 1,
    maxContext: 64,
  },
  {
    base: 500_000_000,
    perToken: 50_000,
    modelMax: 64,
    vramGiB: 2,
    headroom: 50,
    granularity: 8,
    minContext: 1,
  },
];

function makeInput(s: Seed): NormalizedContextFitInputV1 {
  return {
    schemaVersion: "1",
    model: "test-model",
    quantization: "q4_k_m",
    gpuVramGiB: s.vramGiB,
    headroomPercent: s.headroom,
    minContextTokens: s.minContext,
    maxContextTokens: s.maxContext,
    contextGranularity: s.granularity,
  };
}

describe("Property-based solver tests", () => {
  for (const s of seeds) {
    it(`seed: modelMax=${s.modelMax} vram=${s.vramGiB}GiB headroom=${s.headroom}% gran=${s.granularity}`, async () => {
      const provider = new MonotoneProvider({
        modelMaxContextTokens: s.modelMax,
        baseVramBytes: s.base,
        bytesPerToken: s.perToken,
      });

      const input = makeInput(s);
      const result = await solveContextFit(provider, input);

      if (result.status === "fits") {
        expect(result.result.maxContextTokens).toBeGreaterThanOrEqual(
          input.minContextTokens,
        );

        const bounds = computeAlignedBounds(
          input.minContextTokens,
          input.maxContextTokens,
          s.modelMax,
          input.contextGranularity,
        );

        expect(result.result.maxContextTokens % input.contextGranularity).toBe(0);
        expect(result.result.maxContextTokens).toBeLessThanOrEqual(bounds.alignedMax);
        expect(result.result.maxContextTokens).toBeGreaterThanOrEqual(bounds.alignedMin);

        const fitEst = result.result.estimate;
        expect(fitEst.remainingUsableVramBytes).toBeGreaterThanOrEqual(0);

        const { usableVramBytes } = computeUsableVram(
          input.gpuVramGiB,
          input.headroomPercent,
        );

        if (result.boundary.kind === "vram") {
          const nextEst = result.boundary.nextEstimate;
          expect(nextEst.remainingUsableVramBytes).toBeLessThan(0);
          expect(result.boundary.nextContextTokens).toBe(
            result.result.maxContextTokens + input.contextGranularity,
          );
          expect(nextEst.requiredVramBytes).toBeGreaterThan(usableVramBytes);
        }

        if (result.result.maxContextTokens === bounds.alignedMaxContextTokens) {
          if (
            input.maxContextTokens !== undefined &&
            input.maxContextTokens < s.modelMax
          ) {
            expect(
              result.boundary.kind === "caller_limit" ||
                result.boundary.kind === "model_and_caller_limit",
            ).toBe(true);
          }
        }
      } else {
        expect(result.status).toBe("minimum_context_does_not_fit");
        const boundaryEst = result.boundary.estimate;
        expect(boundaryEst.remainingUsableVramBytes).toBeLessThan(0);
      }
    });
  }

  it("increasing VRAM cannot lower the result", async () => {
    const baseS = seeds[0]!;
    const provider1 = new MonotoneProvider({
      modelMaxContextTokens: baseS.modelMax,
      baseVramBytes: baseS.base,
      bytesPerToken: baseS.perToken,
    });
    const provider2 = new MonotoneProvider({
      modelMaxContextTokens: baseS.modelMax,
      baseVramBytes: baseS.base,
      bytesPerToken: baseS.perToken,
    });

    const input1 = makeInput({ ...baseS, vramGiB: 6 });
    const input2 = makeInput({ ...baseS, vramGiB: 24 });

    const [r1, r2] = await Promise.all([
      solveContextFit(provider1, input1),
      solveContextFit(provider2, input2),
    ]);

    if (r1.status === "fits" && r2.status === "fits") {
      expect(r2.result.maxContextTokens).toBeGreaterThanOrEqual(
        r1.result.maxContextTokens,
      );
    }
  });

  it("increasing headroom cannot raise the result", async () => {
    const baseS = seeds[0]!;
    const provider1 = new MonotoneProvider({
      modelMaxContextTokens: baseS.modelMax,
      baseVramBytes: baseS.base,
      bytesPerToken: baseS.perToken,
    });
    const provider2 = new MonotoneProvider({
      modelMaxContextTokens: baseS.modelMax,
      baseVramBytes: baseS.base,
      bytesPerToken: baseS.perToken,
    });

    const input1 = makeInput({ ...baseS, headroom: 0 });
    const input2 = makeInput({ ...baseS, headroom: 50 });

    const [r1, r2] = await Promise.all([
      solveContextFit(provider1, input1),
      solveContextFit(provider2, input2),
    ]);

    if (r1.status === "fits" && r2.status === "fits") {
      expect(r1.result.maxContextTokens).toBeGreaterThanOrEqual(
        r2.result.maxContextTokens,
      );
    } else if (r2.status === "minimum_context_does_not_fit") {
      expect(r1.status).toBe("fits");
    }
  });

  it("raising caller cap cannot lower an otherwise identical result", async () => {
    const providerLow = new MonotoneProvider({
      modelMaxContextTokens: 131072,
      baseVramBytes: ONE_GIB,
      bytesPerToken: 100_000,
    });
    const providerHigh = new MonotoneProvider({
      modelMaxContextTokens: 131072,
      baseVramBytes: ONE_GIB,
      bytesPerToken: 100_000,
    });

    const inputLow = makeInput({
      base: ONE_GIB,
      perToken: 100_000,
      modelMax: 131072,
      vramGiB: 12,
      headroom: 10,
      granularity: 1,
      minContext: 1,
      maxContext: 4096,
    });
    const inputHigh = makeInput({
      base: ONE_GIB,
      perToken: 100_000,
      modelMax: 131072,
      vramGiB: 12,
      headroom: 10,
      granularity: 1,
      minContext: 1,
      maxContext: 65536,
    });

    const [rLow, rHigh] = await Promise.all([
      solveContextFit(providerLow, inputLow),
      solveContextFit(providerHigh, inputHigh),
    ]);

    if (rLow.status === "fits" && rHigh.status === "fits") {
      expect(rHigh.result.maxContextTokens).toBeGreaterThanOrEqual(
        rLow.result.maxContextTokens,
      );
    }
  });

  it("returned context fits and is aligned", async () => {
    for (const s of seeds) {
      const provider = new MonotoneProvider({
        modelMaxContextTokens: s.modelMax,
        baseVramBytes: s.base,
        bytesPerToken: s.perToken,
      });
      const input = makeInput(s);
      const result = await solveContextFit(provider, input);

      if (result.status === "fits") {
        const ctx = result.result.maxContextTokens;
        expect(ctx % s.granularity).toBe(0);
        expect(ctx).toBeGreaterThanOrEqual(s.minContext);
        if (s.maxContext !== undefined) {
          expect(ctx).toBeLessThanOrEqual(s.maxContext);
        }
      }
    }
  });
});
