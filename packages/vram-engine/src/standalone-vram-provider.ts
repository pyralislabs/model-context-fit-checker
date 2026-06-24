import type {
  MathProvider,
  MathProviderRequest,
  ResolvedMathConfiguration,
  ForwardEstimate,
} from "@localairigs/model-context-fit-core";
import { resolveModel } from "./catalog/models.js";
import { resolveQuantization } from "./catalog/quantizations.js";
import { estimateRequiredVram } from "./estimate.js";
import { getAssumptionVersion } from "./catalog/assumptions.js";
import { DATASET_VERSION, PACKAGE_NAME } from "./contracts.js";
import { VramEngineError } from "./errors.js";

export class StandaloneVramProvider implements MathProvider {
  readonly packageName = PACKAGE_NAME;
  readonly packageVersion = "0.1.0";
  readonly assumptionVersion = getAssumptionVersion();
  readonly datasetVersion = DATASET_VERSION;

  resolveConfiguration(input: MathProviderRequest): ResolvedMathConfiguration {
    try {
      const model = resolveModel(input.model);
      const quantization = resolveQuantization(input.quantization);

      return {
        model: model.id,
        quantization: quantization.id,
        runtimeProfile: input.runtimeProfile,
        kvCacheDtype: input.kvCacheDtype,
        modelMaxContextTokens: model.declaredMaxContextTokens,
        units: "bytes",
        provider: {
          packageName: this.packageName,
          packageVersion: this.packageVersion,
          assumptionVersion: this.assumptionVersion,
          datasetVersion: this.datasetVersion,
        },
      };
    } catch (err) {
      if (err instanceof VramEngineError) {
        throw new VramEngineError(
          err.code === "UNKNOWN_MODEL"
            ? "UNSUPPORTED_MODEL"
            : err.code === "UNKNOWN_QUANTIZATION"
              ? "UNSUPPORTED_QUANTIZATION"
              : err.code === "UNKNOWN_RUNTIME_PROFILE"
                ? "UNSUPPORTED_RUNTIME_PROFILE"
                : err.code === "UNKNOWN_KV_CACHE_DTYPE"
                  ? "UNSUPPORTED_KV_CACHE_DTYPE"
                  : "MATH_PROVIDER_FAILURE",
          err.message,
        );
      }
      throw new VramEngineError(
        "MATH_PROVIDER_FAILURE",
        `Configuration resolution failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  estimateRequiredVram(
    input: ResolvedMathConfiguration & { contextTokens: number },
  ): ForwardEstimate {
    try {
      const engineResult = estimateRequiredVram({
        model: input.model,
        quantization: input.quantization,
        contextTokens: input.contextTokens,
        runtimeProfile: (input.runtimeProfile ?? "balanced") as
          | "lean"
          | "balanced"
          | "conservative",
        kvCacheDtype: (input.kvCacheDtype ?? "fp16") as
          | "fp16"
          | "bf16"
          | "fp32"
          | "q8_0"
          | "q4_0",
      });

      return {
        contextTokens: engineResult.contextTokens,
        requiredVramBytes: engineResult.requiredVramBytes,
        breakdownBytes: { ...engineResult.breakdownBytes },
        assumptions: [...engineResult.assumptions],
        warnings: [...engineResult.warnings],
        provider: { ...engineResult.metadata },
      };
    } catch (err) {
      if (err instanceof VramEngineError) {
        throw err;
      }
      throw new VramEngineError(
        "MATH_PROVIDER_FAILURE",
        `Estimate failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
