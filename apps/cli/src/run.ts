import { readFile, readFileSync, statSync } from "node:fs";
import { stdin } from "node:process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateAndNormalizeRequest,
  parseJsonInput,
  solveContextFit,
} from "@localairigs/model-context-fit-core";
import type {
  NormalizedContextFitInputV1,
  ErrorResultV1,
} from "@localairigs/model-context-fit-core";
import { StandaloneVramProvider } from "@localairigs/model-context-fit-vram-engine";
import { formatHuman } from "./format-human.js";
import { formatJson } from "./format-json.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let _cliVersion: string | undefined;
function getCliVersion(): string {
  if (_cliVersion === undefined) {
    try {
      const pkgPath = resolve(__dirname, "../package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
      _cliVersion = pkg.version ?? "0.0.1";
    } catch {
      _cliVersion = "0.0.1";
    }
  }
  return _cliVersion;
}

const INPUT_SIZE_LIMIT = 1 * 1024 * 1024;

export interface CliOptions {
  model?: string;
  quant?: string;
  vramGib?: number;
  headroomPercent?: number;
  minContext?: number;
  maxContext?: number;
  granularity?: number;
  runtimeProfile?: string;
  kvCacheDtype?: string;
  input?: string;
  stdinFlag?: boolean;
  json: boolean;
  pretty: boolean;
  help: boolean;
  version: boolean;
  noColor: boolean;
}

function printHelp(): void {
  const help = `model-context-fit - Find the largest usable context window for a given GPU and model

USAGE:
  model-context-fit --model <id> --quant <id> --vram-gib <number> [options]
  model-context-fit --input request.json [--json]
  cat request.json | model-context-fit --stdin --json
  model-context-fit --help
  model-context-fit --version

OPTIONS:
  --model <id>              Model identifier (required for direct mode)
  --quant <id>              Quantization identifier (required for direct mode)
  --vram-gib <number>       GPU VRAM in GiB (required for direct mode)
  --headroom-percent <num>  Headroom percentage (0-50, default: 10)
  --min-context <int>       Minimum context tokens (default: 1)
  --max-context <int>       Maximum context tokens (optional cap)
  --granularity <int>       Context alignment granularity (default: 1)
  --runtime-profile <id>    Runtime profile (e.g., balanced)
  --kv-cache-dtype <id>     KV cache dtype (e.g., fp16)
  --input <file>            Read JSON request from file
  --stdin                   Read JSON request from stdin
  --json                    Output JSON instead of human-readable text
  --pretty                  Pretty-print JSON output (requires --json)
  --help                    Show this help message
  --version                 Show version

EXIT CODES:
  0  Successful calculation (including minimum_context_does_not_fit)
  2  Invalid input
  3  Provider failure
  1  Internal error
`;
  process.stdout.write(help);
}

function printVersion(): void {
  process.stdout.write(getCliVersion() + "\n");
}

export function parseArgs(argv: string[]): CliOptions & { unknownFlags: string[] } {
  const opts: CliOptions & { unknownFlags: string[] } = {
    json: false,
    pretty: false,
    help: false,
    version: false,
    noColor: false,
    unknownFlags: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) {
      opts.unknownFlags.push(arg);
      continue;
    }
    switch (arg) {
      case "--model":
        if (i + 1 >= argv.length || argv[i + 1]!.startsWith("--")) {
          opts.unknownFlags.push(`${arg} (missing value)`);
          break;
        }
        opts.model = argv[++i]!;
        break;
      case "--quant":
        if (i + 1 >= argv.length || argv[i + 1]!.startsWith("--")) {
          opts.unknownFlags.push(`${arg} (missing value)`);
          break;
        }
        opts.quant = argv[++i]!;
        break;
      case "--vram-gib":
        if (i + 1 >= argv.length || argv[i + 1]!.startsWith("--")) {
          opts.unknownFlags.push(`${arg} (missing value)`);
          break;
        }
        opts.vramGib = Number(argv[++i]!);
        break;
      case "--headroom-percent":
        if (i + 1 >= argv.length || argv[i + 1]!.startsWith("--")) {
          opts.unknownFlags.push(`${arg} (missing value)`);
          break;
        }
        opts.headroomPercent = Number(argv[++i]!);
        break;
      case "--min-context":
        if (i + 1 >= argv.length || argv[i + 1]!.startsWith("--")) {
          opts.unknownFlags.push(`${arg} (missing value)`);
          break;
        }
        opts.minContext = Number(argv[++i]!);
        break;
      case "--max-context":
        if (i + 1 >= argv.length || argv[i + 1]!.startsWith("--")) {
          opts.unknownFlags.push(`${arg} (missing value)`);
          break;
        }
        opts.maxContext = Number(argv[++i]!);
        break;
      case "--granularity":
        if (i + 1 >= argv.length || argv[i + 1]!.startsWith("--")) {
          opts.unknownFlags.push(`${arg} (missing value)`);
          break;
        }
        opts.granularity = Number(argv[++i]!);
        break;
      case "--runtime-profile":
        if (i + 1 >= argv.length || argv[i + 1]!.startsWith("--")) {
          opts.unknownFlags.push(`${arg} (missing value)`);
          break;
        }
        opts.runtimeProfile = argv[++i]!;
        break;
      case "--kv-cache-dtype":
        if (i + 1 >= argv.length || argv[i + 1]!.startsWith("--")) {
          opts.unknownFlags.push(`${arg} (missing value)`);
          break;
        }
        opts.kvCacheDtype = argv[++i]!;
        break;
      case "--input":
        if (i + 1 >= argv.length || argv[i + 1]!.startsWith("--")) {
          opts.unknownFlags.push(`${arg} (missing value)`);
          break;
        }
        opts.input = argv[++i]!;
        break;
      case "--stdin":
        opts.stdinFlag = true;
        break;
      case "--json":
        opts.json = true;
        break;
      case "--pretty":
        opts.pretty = true;
        break;
      case "--help":
        opts.help = true;
        break;
      case "--version":
        opts.version = true;
        break;
      default:
        if (arg.startsWith("--no-color")) {
          opts.noColor = true;
        } else {
          opts.unknownFlags.push(arg);
        }
        break;
    }
  }

  const noColorEnv = process.env.NO_COLOR;
  if (noColorEnv !== undefined) {
    opts.noColor = true;
  }

  return opts;
}

export function checkMutualExclusion(opts: CliOptions): string | null {
  const directMode =
    opts.model !== undefined || opts.quant !== undefined || opts.vramGib !== undefined;
  const modeCount =
    (directMode ? 1 : 0) + (opts.input ? 1 : 0) + (opts.stdinFlag ? 1 : 0);

  if (modeCount === 0) {
    return "No input mode specified. Use --model/--quant/--vram-gib, --input, or --stdin.";
  }
  if (modeCount > 1) {
    return "Mutually exclusive modes: cannot combine --model/--quant/--vram-gib with --input or --stdin.";
  }

  if (opts.pretty && !opts.json) {
    return "--pretty requires --json.";
  }

  if (directMode) {
    if (!opts.model) return "--model is required.";
    if (!opts.quant) return "--quant is required.";
    if (opts.vramGib === undefined || Number.isNaN(opts.vramGib)) {
      return "--vram-gib is required.";
    }
  }

  return null;
}

function readInputFile(filePath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    try {
      const stats = statSync(filePath);
      if (stats.size > INPUT_SIZE_LIMIT) {
        reject(new Error(`Input file exceeds ${INPUT_SIZE_LIMIT} byte limit`));
        return;
      }
    } catch {
      // stat failed, will be caught by readFile
    }

    readFile(filePath, "utf-8", (err, data) => {
      if (err) {
        reject(new Error(`Cannot read input file: ${err.message}`));
      } else {
        resolve(data);
      }
    });
  });
}

function readStdin(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let aborted = false;
    const decoder = new TextDecoder("utf-8", { fatal: true });

    stdin.on("data", (chunk: Buffer) => {
      if (aborted) return;
      totalBytes += chunk.length;
      if (totalBytes > INPUT_SIZE_LIMIT) {
        aborted = true;
        stdin.destroy();
        reject(new Error(`Input exceeds ${INPUT_SIZE_LIMIT} byte limit`));
        return;
      }
      chunks.push(chunk);
    });

    stdin.on("end", () => {
      if (aborted) return;
      try {
        const combined = Buffer.concat(chunks);
        decoder.decode(combined);
        const text = combined.toString("utf-8");
        resolve(text);
      } catch {
        reject(new Error("Input contains invalid UTF-8 sequences"));
      }
    });

    stdin.on("error", (err) => {
      reject(new Error(`Stdin error: ${err.message}`));
    });
  });
}

async function resolveInput(opts: CliOptions): Promise<unknown> {
  if (opts.input) {
    const text = await readInputFile(opts.input);
    const parsed = parseJsonInput(text, INPUT_SIZE_LIMIT);
    return parsed;
  }
  if (opts.stdinFlag) {
    const text = await readStdin();
    const parsed = parseJsonInput(text, INPUT_SIZE_LIMIT);
    return parsed;
  }

  const input: Record<string, unknown> = {
    schemaVersion: "1",
    model: opts.model,
    quantization: opts.quant,
    gpuVramGiB: opts.vramGib,
  };
  if (opts.headroomPercent !== undefined) input.headroomPercent = opts.headroomPercent;
  if (opts.minContext !== undefined) input.minContextTokens = opts.minContext;
  if (opts.maxContext !== undefined) input.maxContextTokens = opts.maxContext;
  if (opts.granularity !== undefined) input.contextGranularity = opts.granularity;
  if (opts.runtimeProfile !== undefined) input.runtimeProfile = opts.runtimeProfile;
  if (opts.kvCacheDtype !== undefined) input.kvCacheDtype = opts.kvCacheDtype;

  return input;
}

export function getErrorExitCode(code: string): number {
  switch (code) {
    case "INVALID_INPUT":
    case "UNSUPPORTED_SCHEMA_VERSION":
    case "UNSUPPORTED_MODEL":
    case "UNSUPPORTED_QUANTIZATION":
    case "UNSUPPORTED_RUNTIME_PROFILE":
    case "UNSUPPORTED_KV_CACHE_DTYPE":
      return 2;
    case "MATH_PROVIDER_FAILURE":
    case "MATH_PROVIDER_INVALID_RESULT":
    case "MATH_PROVIDER_NON_MONOTONE":
    case "MATH_PROVIDER_INCONSISTENT":
      return 3;
    default:
      return 1;
  }
}

export async function run(argv: string[]): Promise<number> {
  const opts = parseArgs(argv);

  if (opts.unknownFlags.length > 0) {
    process.stderr.write(`Error: Unknown flags: ${opts.unknownFlags.join(", ")}\n`);
    return 2;
  }

  if (opts.help) {
    printHelp();
    return 0;
  }
  if (opts.version) {
    printVersion();
    return 0;
  }

  const error = checkMutualExclusion(opts);
  if (error) {
    const errResult: ErrorResultV1 = {
      schemaVersion: "1",
      error: {
        code: "INVALID_INPUT",
        message: error,
      },
    };
    if (opts.json) {
      process.stdout.write(formatJson(errResult, opts.pretty) + "\n");
    } else {
      process.stderr.write(`Error: ${error}\n`);
    }
    return 2;
  }

  let rawInput: unknown;
  try {
    rawInput = await resolveInput(opts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const errResult: ErrorResultV1 = {
      schemaVersion: "1",
      error: { code: "INVALID_INPUT", message: msg },
    };
    if (opts.json) {
      process.stdout.write(formatJson(errResult, opts.pretty) + "\n");
    } else {
      process.stderr.write(`Error: ${msg}\n`);
    }
    return 2;
  }

  let normalized: NormalizedContextFitInputV1;
  try {
    normalized = validateAndNormalizeRequest(rawInput);
  } catch (err) {
    const solverErr = err as {
      toErrorResult?: () => ErrorResultV1;
      code?: string;
      message?: string;
    };
    const errResult: ErrorResultV1 =
      typeof solverErr.toErrorResult === "function"
        ? solverErr.toErrorResult()
        : {
            schemaVersion: "1",
            error: {
              code: "INVALID_INPUT",
              message: solverErr.message ?? String(err),
            },
          };
    if (opts.json) {
      process.stdout.write(formatJson(errResult, opts.pretty) + "\n");
    } else {
      process.stderr.write(`Error: ${errResult.error.message}\n`);
      if (errResult.error.issues) {
        for (const issue of errResult.error.issues) {
          process.stderr.write(`  ${issue.path}: ${issue.message}\n`);
        }
      }
    }
    return 2;
  }

  try {
    const provider = new StandaloneVramProvider();
    const result = await solveContextFit(provider, normalized);

    if (opts.json) {
      process.stdout.write(formatJson(result, opts.pretty) + "\n");
    } else {
      process.stdout.write(formatHuman(result, normalized) + "\n");
    }
    return 0;
  } catch (err) {
    const solverErr = err as {
      toErrorResult?: () => ErrorResultV1;
      code?: string;
      message?: string;
    };

    let errResult: ErrorResultV1;
    if (typeof solverErr.toErrorResult === "function") {
      errResult = solverErr.toErrorResult();
    } else {
      errResult = {
        schemaVersion: "1",
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      };
    }

    if (opts.json) {
      process.stdout.write(formatJson(errResult, opts.pretty) + "\n");
    } else {
      process.stderr.write(`Error: ${errResult.error.message}\n`);
    }
    return getErrorExitCode(errResult.error.code);
  }
}
