import { describe, it, expect } from "vitest";
import { LocalLlmVramProvider } from "../src/local-llm-vram-provider.js";

const provider = new LocalLlmVramProvider();

describe("adapter integration (blocked - upstream gaps)", () => {
  it("should have correct package name", () => {
    expect(provider.packageName).toBe("local-llm-vram-calculator");
  });

  it("should have a package version string", () => {
    expect(typeof provider.packageVersion).toBe("string");
    expect(provider.packageVersion.length).toBeGreaterThan(0);
  });

  it("resolveConfiguration should throw for unknown model", () => {
    expect(() => {
      provider.resolveConfiguration({
        model: "nonexistent-model",
        quantization: "q4_k_m",
      });
    }).toThrow();
  });

  it("resolveConfiguration should throw for empty model", () => {
    expect(() => {
      provider.resolveConfiguration({ model: "", quantization: "q4_k_m" });
    }).toThrow();
  });
});
