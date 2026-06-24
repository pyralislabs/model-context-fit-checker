import { describe, it, expect } from "vitest";
import { parseArgs, checkMutualExclusion, getErrorExitCode } from "../src/run.js";

describe("parseArgs", () => {
  it("parses all direct flags", () => {
    const opts = parseArgs([
      "--model",
      "llama-3.1-8b",
      "--quant",
      "q4_k_m",
      "--vram-gib",
      "24",
      "--headroom-percent",
      "10",
      "--min-context",
      "1",
      "--max-context",
      "8192",
      "--granularity",
      "128",
      "--runtime-profile",
      "balanced",
      "--kv-cache-dtype",
      "fp16",
      "--json",
      "--pretty",
    ]);
    expect(opts.model).toBe("llama-3.1-8b");
    expect(opts.quant).toBe("q4_k_m");
    expect(opts.vramGib).toBe(24);
    expect(opts.headroomPercent).toBe(10);
    expect(opts.minContext).toBe(1);
    expect(opts.maxContext).toBe(8192);
    expect(opts.granularity).toBe(128);
    expect(opts.runtimeProfile).toBe("balanced");
    expect(opts.kvCacheDtype).toBe("fp16");
    expect(opts.json).toBe(true);
    expect(opts.pretty).toBe(true);
  });

  it("parses --help and --version", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["--version"]).version).toBe(true);
  });

  it("parses --stdin and --no-color", () => {
    const opts = parseArgs(["--stdin", "--no-color"]);
    expect(opts.stdinFlag).toBe(true);
    expect(opts.noColor).toBe(true);
  });

  it("collects unknown flags", () => {
    const opts = parseArgs(["--unknown-flag", "value"]);
    expect(opts.unknownFlags).toContain("--unknown-flag");
  });

  it("honors NO_COLOR env", () => {
    const opts = parseArgs(["--json"]);
    expect(opts.noColor).toBe(false);
  });
});

describe("checkMutualExclusion", () => {
  it("returns null for valid direct mode", () => {
    const err = checkMutualExclusion({
      model: "test",
      quant: "q4_k_m",
      vramGib: 12,
      json: false,
      pretty: false,
      help: false,
      version: false,
      noColor: false,
    });
    expect(err).toBeNull();
  });

  it("returns error when no mode specified", () => {
    const err = checkMutualExclusion({
      json: false,
      pretty: false,
      help: false,
      version: false,
      noColor: false,
    });
    expect(err).toContain("No input mode");
  });

  it("returns error for missing model", () => {
    const err = checkMutualExclusion({
      quant: "q4_k_m",
      vramGib: 12,
      json: false,
      pretty: false,
      help: false,
      version: false,
      noColor: false,
    });
    expect(err).toContain("--model");
  });

  it("returns error for missing quant", () => {
    const err = checkMutualExclusion({
      model: "test",
      vramGib: 12,
      json: false,
      pretty: false,
      help: false,
      version: false,
      noColor: false,
    });
    expect(err).toContain("--quant");
  });

  it("returns error for missing vramGib", () => {
    const err = checkMutualExclusion({
      model: "test",
      quant: "q4_k_m",
      json: false,
      pretty: false,
      help: false,
      version: false,
      noColor: false,
    });
    expect(err).toContain("--vram-gib");
  });

  it("returns error for --pretty without --json", () => {
    const err = checkMutualExclusion({
      model: "test",
      quant: "q4_k_m",
      vramGib: 12,
      pretty: true,
      json: false,
      help: false,
      version: false,
      noColor: false,
    });
    expect(err).toContain("--pretty requires --json");
  });

  it("detects mutually exclusive modes", () => {
    const err = checkMutualExclusion({
      model: "test",
      quant: "q4_k_m",
      vramGib: 12,
      stdinFlag: true,
      json: false,
      pretty: false,
      help: false,
      version: false,
      noColor: false,
    });
    expect(err).toContain("Mutually exclusive");
  });
});

describe("getErrorExitCode", () => {
  it("returns 2 for validation errors", () => {
    expect(getErrorExitCode("INVALID_INPUT")).toBe(2);
    expect(getErrorExitCode("UNSUPPORTED_SCHEMA_VERSION")).toBe(2);
    expect(getErrorExitCode("UNSUPPORTED_MODEL")).toBe(2);
    expect(getErrorExitCode("UNSUPPORTED_QUANTIZATION")).toBe(2);
    expect(getErrorExitCode("UNSUPPORTED_RUNTIME_PROFILE")).toBe(2);
    expect(getErrorExitCode("UNSUPPORTED_KV_CACHE_DTYPE")).toBe(2);
  });

  it("returns 3 for provider errors", () => {
    expect(getErrorExitCode("MATH_PROVIDER_FAILURE")).toBe(3);
    expect(getErrorExitCode("MATH_PROVIDER_INVALID_RESULT")).toBe(3);
    expect(getErrorExitCode("MATH_PROVIDER_NON_MONOTONE")).toBe(3);
    expect(getErrorExitCode("MATH_PROVIDER_INCONSISTENT")).toBe(3);
  });

  it("returns 1 for internal errors", () => {
    expect(getErrorExitCode("INTERNAL_ERROR")).toBe(1);
  });

  it("returns 1 for unknown codes", () => {
    expect(getErrorExitCode("UNKNOWN_CODE")).toBe(1);
  });
});
