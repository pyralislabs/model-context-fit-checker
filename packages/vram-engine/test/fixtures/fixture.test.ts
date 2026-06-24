import { describe, it, expect } from "vitest";
import { estimateRequiredVram } from "../../src/estimate.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface FixtureEntry {
  label: string;
  request: {
    model: string;
    quantization: string;
    runtimeProfile?: string;
    kvCacheDtype?: string;
    contextTokens: number;
  };
  expected: {
    requiredVramBytes: number;
    breakdownBytes: {
      weights: number;
      kvCache: number;
      runtimeFixed: number;
      computeBuffer: number;
      safetyMargin: number;
    };
  };
}

function loadFixtures(): FixtureEntry[] {
  const fixturePath = resolve(__dirname, "forward-estimates.v1.json");
  const raw = JSON.parse(readFileSync(fixturePath, "utf-8"));
  return (Array.isArray(raw) ? raw[0]?.fixtures : raw.fixtures) ?? [];
}

describe("forward estimate fixtures", () => {
  const fixtures = loadFixtures();

  it("has fixture entries to test", () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  for (const fx of fixtures) {
    it(`matches expected bytes for: ${fx.label}`, () => {
      const result = estimateRequiredVram({
        model: fx.request.model,
        quantization: fx.request.quantization,
        runtimeProfile: fx.request.runtimeProfile ?? "balanced",
        kvCacheDtype: fx.request.kvCacheDtype ?? "fp16",
        contextTokens: fx.request.contextTokens,
      });

      expect(result.requiredVramBytes).toBe(fx.expected.requiredVramBytes);
      expect(result.breakdownBytes.weights).toBe(fx.expected.breakdownBytes.weights);
      expect(result.breakdownBytes.kvCache).toBe(fx.expected.breakdownBytes.kvCache);
      expect(result.breakdownBytes.runtimeFixed).toBe(
        fx.expected.breakdownBytes.runtimeFixed,
      );
      expect(result.breakdownBytes.computeBuffer).toBe(
        fx.expected.breakdownBytes.computeBuffer,
      );
      expect(result.breakdownBytes.safetyMargin).toBe(
        fx.expected.breakdownBytes.safetyMargin,
      );
    });
  }
});
