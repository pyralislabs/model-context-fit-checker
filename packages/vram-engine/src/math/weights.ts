import { safeCeil, isPositiveSafeInteger } from "../constants.js";
import { invalidNumericInput } from "../errors.js";

/**
 * Calculate weight memory in bytes.
 *
 * formula: ceil(parameterCount * effectiveBitsPerWeight / 8)
 *
 * Requirements:
 * - positive safe-integer parameter count
 * - positive finite effective bits per weight
 * - overflow checked before division
 * - output is a non-negative safe integer
 */
export function computeWeightBytes(
  parameterCount: number,
  effectiveBitsPerWeight: number,
): number {
  if (!isPositiveSafeInteger(parameterCount)) {
    throw invalidNumericInput(
      `Parameter count must be a positive safe integer, got ${parameterCount}`,
    );
  }

  if (
    typeof effectiveBitsPerWeight !== "number" ||
    !Number.isFinite(effectiveBitsPerWeight) ||
    effectiveBitsPerWeight <= 0
  ) {
    throw invalidNumericInput(
      `Effective bits per weight must be positive and finite, got ${effectiveBitsPerWeight}`,
    );
  }

  const product = parameterCount * effectiveBitsPerWeight;
  if (!Number.isSafeInteger(product)) {
    throw invalidNumericInput(
      `Overflow: parameterCount (${parameterCount}) * effectiveBitsPerWeight (${effectiveBitsPerWeight}) is not a safe integer`,
    );
  }

  return safeCeil(product / 8);
}
