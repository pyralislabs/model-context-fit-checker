import { describe, it, expect } from "vitest";
import provenanceData from "../data/provenance.json" with { type: "json" };

describe("provenance data", () => {
  it("has a version", () => {
    expect(provenanceData).toHaveProperty("version");
    expect(typeof provenanceData.version).toBe("string");
  });

  it("has sources array", () => {
    expect(Array.isArray(provenanceData.sources)).toBe(true);
    expect(provenanceData.sources.length).toBeGreaterThan(0);
  });

  it("every source has required fields", () => {
    for (const source of provenanceData.sources as Array<Record<string, unknown>>) {
      expect(source.id).toBeTruthy();
      expect(source.publisher).toBeTruthy();
      expect(source.title).toBeTruthy();
      expect(source.url).toBeTruthy();
      expect(source.license).toBeTruthy();
      expect(source.usageNote).toBeTruthy();
      expect(Array.isArray(source.appliesTo)).toBe(true);
    }
  });

  it("every source URL is HTTPS", () => {
    for (const source of provenanceData.sources as Array<{ url: string }>) {
      expect(source.url).toMatch(/^https:\/\//);
    }
  });

  it("every source appliesTo is valid", () => {
    const valid = new Set(["models", "quantizations", "assumptions"]);
    for (const source of provenanceData.sources as Array<{ appliesTo: string[] }>) {
      for (const target of source.appliesTo) {
        expect(valid.has(target)).toBe(true);
      }
    }
  });
});
