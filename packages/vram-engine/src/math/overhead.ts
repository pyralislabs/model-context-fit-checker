import { ONE_GIB, safeCeil, assertSafeInteger } from "../constants.js";

export type OverheadInput = {
  weightBytes: number;
  fixedGiB: number;
  minimumComputeGiB: number;
  weightBufferFraction: number;
  minimumSafetyGiB: number;
  safetyFraction: number;
};

export type OverheadOutput = {
  runtimeFixedBytes: number;
  computeBufferBytes: number;
  safetyMarginBytes: number;
};

/**
 * Calculate runtime overhead, compute buffer, and safety margin.
 *
 * runtimeFixedBytes = ceil(fixedGiB * 2^30)
 * computeBufferBytes = ceil(max(minimumComputeGiB * 2^30, weightBytes * weightBufferFraction))
 * subtotalWithoutSafety = weightBytes + runtimeFixedBytes + computeBufferBytes
 * safetyMarginBytes = ceil(max(minimumSafetyGiB * 2^30, subtotalWithoutSafety * safetyFraction))
 */
export function computeOverhead(input: OverheadInput): OverheadOutput {
  assertSafeInteger(input.weightBytes, "weightBytes");

  const runtimeFixedBytes = safeCeil(input.fixedGiB * ONE_GIB);

  const computeMinBytes = safeCeil(input.minimumComputeGiB * ONE_GIB);
  const computeFractionBytes = safeCeil(input.weightBytes * input.weightBufferFraction);
  const computeBufferBytes = Math.max(computeMinBytes, computeFractionBytes);
  if (!Number.isSafeInteger(computeBufferBytes)) {
    throw new RangeError("computeBufferBytes not safe integer");
  }

  const subtotalWithoutSafety =
    input.weightBytes + runtimeFixedBytes + computeBufferBytes;
  if (!Number.isSafeInteger(subtotalWithoutSafety)) {
    throw new RangeError("subtotalWithoutSafety not safe integer");
  }

  const safetyMinBytes = safeCeil(input.minimumSafetyGiB * ONE_GIB);
  const safetyFractionBytes = safeCeil(subtotalWithoutSafety * input.safetyFraction);
  const safetyMarginBytes = Math.max(safetyMinBytes, safetyFractionBytes);
  if (!Number.isSafeInteger(safetyMarginBytes)) {
    throw new RangeError("safetyMarginBytes not safe integer");
  }

  return { runtimeFixedBytes, computeBufferBytes, safetyMarginBytes };
}
