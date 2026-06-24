import { computeWeightBytes } from "./math/weights.js";
import { computeKvCacheBytes } from "./math/kv-cache.js";
import { computeOverhead } from "./math/overhead.js";
import { resolveModel } from "./catalog/models.js";
import { resolveQuantization } from "./catalog/quantizations.js";
import {
  resolveRuntimeProfile,
  resolveKvCacheDtype,
  getParallelSequences,
  getAssumptionLines,
} from "./catalog/assumptions.js";
import type { StandaloneForwardRequest, StandaloneForwardEstimate } from "./contracts.js";
import { ASSUMPTION_VERSION, DATASET_VERSION, PACKAGE_NAME } from "./contracts.js";
import { VramEngineError } from "./errors.js";

export function estimateRequiredVram(
  request: StandaloneForwardRequest,
): StandaloneForwardEstimate {
  const model = resolveModel(request.model);
  const quantization = resolveQuantization(request.quantization);
  const runtimeProfile = resolveRuntimeProfile(request.runtimeProfile ?? "balanced");
  const kvDtype = resolveKvCacheDtype(request.kvCacheDtype ?? "fp16");

  const weightBytes = computeWeightBytes(
    model.parameterCount,
    quantization.effectiveBitsPerWeight,
  );

  const kvCacheBytes = computeKvCacheBytes(
    request.contextTokens,
    model.layers,
    model.kvHeads,
    model.headDim,
    kvDtype.bytesPerElement,
    getParallelSequences(),
  );

  const overhead = computeOverhead({
    weightBytes,
    fixedGiB: runtimeProfile.fixedGiB,
    minimumComputeGiB: runtimeProfile.minimumComputeGiB,
    weightBufferFraction: runtimeProfile.weightBufferFraction,
    minimumSafetyGiB: runtimeProfile.minimumSafetyGiB,
    safetyFraction: runtimeProfile.safetyFraction,
  });

  const requiredVramBytes =
    weightBytes +
    kvCacheBytes +
    overhead.runtimeFixedBytes +
    overhead.computeBufferBytes +
    overhead.safetyMarginBytes;

  if (!Number.isSafeInteger(requiredVramBytes)) {
    throw new VramEngineError(
      "ESTIMATE_OVERFLOW",
      "Total required VRAM exceeds safe integer range",
    );
  }

  const assumptions = [...getAssumptionLines()];
  const warnings: string[] = [];

  if (kvDtype.warnIdealized) {
    warnings.push(
      `KV cache dtype "${request.kvCacheDtype ?? "fp16"}" uses an idealized byte estimate; actual implementation may differ.`,
    );
  }

  const metadata = {
    packageName: PACKAGE_NAME,
    packageVersion: "0.1.0",
    assumptionVersion: ASSUMPTION_VERSION,
    datasetVersion: DATASET_VERSION,
  };

  return {
    contextTokens: request.contextTokens,
    requiredVramBytes,
    breakdownBytes: {
      weights: weightBytes,
      kvCache: kvCacheBytes,
      runtimeFixed: overhead.runtimeFixedBytes,
      computeBuffer: overhead.computeBufferBytes,
      safetyMargin: overhead.safetyMarginBytes,
    },
    assumptions,
    warnings,
    metadata,
  };
}
