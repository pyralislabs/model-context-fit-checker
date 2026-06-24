import { describe, it, expect } from "vitest";
import { resolveModel, listModels } from "../src/catalog/models.js";
import { resolveQuantization, listQuantizations } from "../src/catalog/quantizations.js";

describe("model catalog", () => {
  it("resolves known model by id", () => {
    const model = resolveModel("llama-3.1-8b");
    expect(model.id).toBe("llama-3.1-8b");
    expect(model.parameterCount).toBeGreaterThan(0);
    expect(model.declaredMaxContextTokens).toBeGreaterThan(0);
  });

  it("resolves known model by alias", () => {
    const model = resolveModel("llama3.1-8b");
    expect(model.id).toBe("llama-3.1-8b");
  });

  it("resolves known model by case-insensitive alias", () => {
    const model = resolveModel("LLAMA3.1-8B");
    expect(model.id).toBe("llama-3.1-8b");
  });

  it("throws for unknown model", () => {
    expect(() => resolveModel("nonexistent-model")).toThrow();
  });

  it("returns non-empty model list", () => {
    const models = listModels();
    expect(models.length).toBeGreaterThan(0);
  });

  it("each model has required fields", () => {
    const models = listModels();
    for (const m of models) {
      expect(m.id).toBeTruthy();
      expect(m.displayName).toBeTruthy();
      expect(m.parameterCount).toBeGreaterThan(0);
      expect(m.declaredMaxContextTokens).toBeGreaterThan(0);
    }
  });
});

describe("quantization catalog", () => {
  it("resolves known quantization", () => {
    const q = resolveQuantization("q4_k_m");
    expect(q.id).toBe("q4_k_m");
    expect(q.effectiveBitsPerWeight).toBe(4);
  });

  it("throws for unknown quantization", () => {
    expect(() => resolveQuantization("nonexistent")).toThrow();
  });

  it("returns non-empty quantization list", () => {
    const list = listQuantizations();
    expect(list.length).toBeGreaterThan(0);
  });
});
