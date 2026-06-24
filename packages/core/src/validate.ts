import { ContextFitRequestV1Schema } from "./contracts.js";
import { invalidInput, unsupportedSchemaVersion } from "./errors.js";
import type { ContextFitRequestV1, NormalizedContextFitInputV1 } from "./contracts.js";

export function validateAndNormalizeRequest(raw: unknown): NormalizedContextFitInputV1 {
  if (typeof raw === "object" && raw !== null && "schemaVersion" in raw) {
    const sv = (raw as Record<string, unknown>).schemaVersion;
    if (sv !== "1") {
      throw unsupportedSchemaVersion(String(sv));
    }
  }

  const result = ContextFitRequestV1Schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      code: issue.code,
      message: issue.message,
    }));
    throw invalidInput("Invalid request", issues);
  }

  return normalizeRequest(result.data);
}

function normalizeRequest(raw: ContextFitRequestV1): NormalizedContextFitInputV1 {
  return {
    schemaVersion: "1",
    model: raw.model,
    quantization: raw.quantization,
    gpuVramGiB: raw.gpuVramGiB,
    headroomPercent: raw.headroomPercent,
    minContextTokens: raw.minContextTokens,
    maxContextTokens: raw.maxContextTokens,
    contextGranularity: raw.contextGranularity,
    runtimeProfile: raw.runtimeProfile,
    kvCacheDtype: raw.kvCacheDtype,
  };
}

export function parseJsonInput(text: string, maxBytes: number): unknown {
  const encoder = new TextEncoder();
  if (encoder.encode(text).length > maxBytes) {
    throw invalidInput(`Input exceeds ${maxBytes} byte limit`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw invalidInput("Invalid JSON");
  }

  return parsed;
}

export function validateErrorResultShape(output: unknown): boolean {
  if (typeof output !== "object" || output === null) return false;
  const obj = output as Record<string, unknown>;
  if (obj.schemaVersion !== "1") return false;
  if (typeof obj.error !== "object" || obj.error === null) return false;
  const err = obj.error as Record<string, unknown>;
  if (typeof err.code !== "string") return false;
  if (typeof err.message !== "string") return false;
  return true;
}
