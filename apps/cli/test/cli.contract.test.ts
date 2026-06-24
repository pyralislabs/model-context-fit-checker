import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliPath = resolve(__dirname, "../dist/bin.js");

function runCli(args: string[]): { stdout: string; stderr: string; status: number } {
  const result = spawnSync("node", [cliPath, ...args], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

const binaryExists = existsSync(cliPath);

function isProviderAvailable(): boolean {
  if (!binaryExists) return false;
  const { stdout } = runCli([
    "--model",
    "llama-3.1-8b",
    "--quant",
    "q4_k_m",
    "--vram-gib",
    "24",
    "--json",
  ]);
  try {
    const parsed = JSON.parse(stdout);
    return parsed.status === "fits" || parsed.status === "minimum_context_does_not_fit";
  } catch {
    return false;
  }
}

const providerAvailable = isProviderAvailable();

beforeAll(() => {
  if (!binaryExists) {
    console.warn(
      "  [cli.contract.test.ts] Binary not found at",
      cliPath,
      "- skipping CLI binary tests. Run `pnpm build` first.",
    );
  }
  if (!providerAvailable) {
    console.warn(
      "  [cli.contract.test.ts] Provider not available - skipping calculation tests.",
    );
  }
});

describe("CLI parsing and validation", () => {
  it("rejects missing required args", () => {
    const { stdout, stderr, status } = runCli(["--json"]);
    expect(status).toBe(2);
    const output = stdout || stderr;
    expect(output).toContain("INVALID_INPUT");
  });

  it("rejects mutually exclusive modes", () => {
    const { stderr, status } = runCli([
      "--model",
      "test",
      "--quant",
      "q4_k_m",
      "--vram-gib",
      "12",
      "--stdin",
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain("Mutually exclusive");
  });

  it("exit code 2 for invalid vram", () => {
    const { stderr, status } = runCli([
      "--model",
      "test",
      "--quant",
      "q4_k_m",
      "--vram-gib",
      "-1",
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain("Error");
  });

  it("exit code 2 for missing model", () => {
    const { stderr, status } = runCli(["--quant", "q4_k_m", "--vram-gib", "12"]);
    expect(status).toBe(2);
    expect(stderr).toContain("--model");
  });

  it("--pretty requires --json", () => {
    const { stderr, status } = runCli([
      "--model",
      "test",
      "--quant",
      "q4_k_m",
      "--vram-gib",
      "12",
      "--pretty",
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain("--pretty requires --json");
  });

  it("exit code 3 for provider failure with made-up model", () => {
    const { stderr, status } = runCli([
      "--model",
      "this-model-definitely-does-not-exist-xyz",
      "--quant",
      "q4_k_m",
      "--vram-gib",
      "24",
    ]);
    expect(status).toBe(3);
    expect(stderr).toContain("Error");
  });
});

describe.skipIf(!binaryExists)("CLI binary availability", () => {
  it("prints help", () => {
    const { stdout, status } = runCli(["--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("model-context-fit");
    expect(stdout).toContain("--model");
  });

  it("prints version", () => {
    const { stdout, status } = runCli(["--version"]);
    expect(status).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe.skipIf(!binaryExists || !providerAvailable)(
  "CLI calculation (needs working provider)",
  () => {
    it("produces valid JSON output with --json flag", () => {
      const { stdout, status } = runCli([
        "--model",
        "llama-3.1-8b",
        "--quant",
        "q4_k_m",
        "--vram-gib",
        "24",
        "--json",
      ]);
      expect(status).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed).toHaveProperty("schemaVersion", "1");
      expect(parsed).toHaveProperty("budget");
      expect(parsed).toHaveProperty("search");
      expect(parsed).toHaveProperty("provider");
    });

    it("human output includes disclaimer", () => {
      const { stdout, status } = runCli([
        "--model",
        "llama-3.1-8b",
        "--quant",
        "q4_k_m",
        "--vram-gib",
        "24",
      ]);
      expect(status).toBe(0);
      expect(stdout).toContain("estimate");
      expect(stdout).toContain("benchmark");
    });

    it("handles --headroom-percent boundary values", () => {
      const { stdout, status } = runCli([
        "--model",
        "llama-3.1-8b",
        "--quant",
        "q4_k_m",
        "--vram-gib",
        "24",
        "--headroom-percent",
        "0",
        "--json",
      ]);
      expect(status).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.budget.headroomPercent).toBe(0);
    });
  },
);
