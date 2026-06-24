export class VramEngineError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "VramEngineError";
    this.code = code;
  }
}

export function unknownModel(model: string): VramEngineError {
  return new VramEngineError("UNKNOWN_MODEL", `Unknown model: ${model}`);
}

export function unknownQuantization(quant: string): VramEngineError {
  return new VramEngineError("UNKNOWN_QUANTIZATION", `Unknown quantization: ${quant}`);
}

export function unknownRuntimeProfile(profile: string): VramEngineError {
  return new VramEngineError(
    "UNKNOWN_RUNTIME_PROFILE",
    `Unknown runtime profile: ${profile}`,
  );
}

export function unknownKvCacheDtype(dtype: string): VramEngineError {
  return new VramEngineError(
    "UNKNOWN_KV_CACHE_DTYPE",
    `Unknown KV cache dtype: ${dtype}`,
  );
}

export function invalidNumericInput(message: string): VramEngineError {
  return new VramEngineError("INVALID_NUMERIC_INPUT", message);
}
