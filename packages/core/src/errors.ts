import type { ErrorResultV1 } from "./contracts.js";

export type ErrorCode = ErrorResultV1["error"]["code"];

export class SolverError extends Error {
  readonly code: ErrorCode;
  readonly issues: Array<{ path: string; code: string; message: string }> | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    issues?: Array<{ path: string; code: string; message: string }>,
  ) {
    super(message);
    this.name = "SolverError";
    this.code = code;
    this.issues = issues;
  }

  toErrorResult(): ErrorResultV1 {
    return {
      schemaVersion: "1",
      error: {
        code: this.code,
        message: this.message,
        issues: this.issues,
      },
    };
  }
}

export function unsupportedSchemaVersion(version: string): SolverError {
  return new SolverError(
    "UNSUPPORTED_SCHEMA_VERSION",
    `Unsupported schema version: ${version}`,
  );
}

export function invalidInput(
  message: string,
  issues?: Array<{ path: string; code: string; message: string }>,
): SolverError {
  return new SolverError("INVALID_INPUT", message, issues);
}

export function unsupportedModel(model: string): SolverError {
  return new SolverError("UNSUPPORTED_MODEL", `Unsupported model: ${model}`);
}

export function unsupportedQuantization(quant: string): SolverError {
  return new SolverError(
    "UNSUPPORTED_QUANTIZATION",
    `Unsupported quantization: ${quant}`,
  );
}

export function unsupportedRuntimeProfile(profile: string): SolverError {
  return new SolverError(
    "UNSUPPORTED_RUNTIME_PROFILE",
    `Unsupported runtime profile: ${profile}`,
  );
}

export function unsupportedKvCacheDtype(dtype: string): SolverError {
  return new SolverError(
    "UNSUPPORTED_KV_CACHE_DTYPE",
    `Unsupported KV cache dtype: ${dtype}`,
  );
}

export function providerFailure(message: string): SolverError {
  return new SolverError("MATH_PROVIDER_FAILURE", message);
}

export function providerInvalidResult(message: string): SolverError {
  return new SolverError("MATH_PROVIDER_INVALID_RESULT", message);
}

export function providerNonMonotone(message: string): SolverError {
  return new SolverError("MATH_PROVIDER_NON_MONOTONE", message);
}

export function providerInconsistent(message: string): SolverError {
  return new SolverError("MATH_PROVIDER_INCONSISTENT", message);
}

export function internalError(message: string): SolverError {
  return new SolverError("INTERNAL_ERROR", message);
}
