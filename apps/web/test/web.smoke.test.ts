import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const distIndex = resolve(__dirname, "../dist/index.html");

describe.runIf(existsSync(distIndex))("web smoke tests", () => {
  it("production build exists", () => {
    expect(existsSync(distIndex)).toBe(true);
  });

  it("index.html contains key elements", () => {
    const html = readFileSync(distIndex, "utf-8");
    expect(html).toContain("Model Context Fit Checker");
    expect(html).toContain("localairigs.com");
    expect(html).toContain("pyralislabs.io");
  });

  it("headers file exists", () => {
    const headersPath = resolve(__dirname, "../public/_headers");
    expect(existsSync(headersPath)).toBe(true);
    const headers = readFileSync(headersPath, "utf-8");
    expect(headers).toContain("Content-Security-Policy");
    expect(headers).toContain("default-src 'self'");
  });
});
