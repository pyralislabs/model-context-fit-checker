import { safeCeil, isPositiveSafeInteger } from "../constants.js";
import { invalidNumericInput } from "../errors.js";

/**
 * Calculate KV-cache memory in bytes.
 *
 * formula: ceil(contextTokens * layers * kvHeads * headDim * 2 * kvElementBytes * parallelSequences)
 *
 * For the current inverse contract:
 * - parallelSequences is fixed at 1
 * - 2 represents key plus value
 * - every intermediate product must be finite and safe
 */
export function computeKvCacheBytes(
  contextTokens: number,
  layers: number,
  kvHeads: number,
  headDim: number,
  kvElementBytes: number,
  parallelSequences: number,
): number {
  if (!isPositiveSafeInteger(contextTokens)) {
    throw invalidNumericInput(
      `contextTokens must be a positive safe integer, got ${contextTokens}`,
    );
  }
  if (!isPositiveSafeInteger(layers)) {
    throw invalidNumericInput(`layers must be a positive safe integer, got ${layers}`);
  }
  if (!isPositiveSafeInteger(kvHeads)) {
    throw invalidNumericInput(`kvHeads must be a positive safe integer, got ${kvHeads}`);
  }
  if (!isPositiveSafeInteger(headDim)) {
    throw invalidNumericInput(`headDim must be a positive safe integer, got ${headDim}`);
  }
  if (
    typeof kvElementBytes !== "number" ||
    !Number.isFinite(kvElementBytes) ||
    kvElementBytes <= 0
  ) {
    throw invalidNumericInput(
      `kvElementBytes must be positive and finite, got ${kvElementBytes}`,
    );
  }
  if (!isPositiveSafeInteger(parallelSequences)) {
    throw invalidNumericInput(
      `parallelSequences must be a positive safe integer, got ${parallelSequences}`,
    );
  }

  const step1 = contextTokens * layers;
  if (!Number.isSafeInteger(step1)) {
    throw invalidNumericInput("Overflow: contextTokens * layers");
  }

  const step2 = step1 * kvHeads;
  if (!Number.isSafeInteger(step2)) {
    throw invalidNumericInput("Overflow: contextTokens * layers * kvHeads");
  }

  const step3 = step2 * headDim;
  if (!Number.isSafeInteger(step3)) {
    throw invalidNumericInput("Overflow: contextTokens * layers * kvHeads * headDim");
  }

  const step4 = step3 * 2;
  if (!Number.isSafeInteger(step4)) {
    throw invalidNumericInput("Overflow: contextTokens * layers * kvHeads * headDim * 2");
  }

  const step5 = step4 * kvElementBytes;
  if (!Number.isSafeInteger(step5)) {
    throw invalidNumericInput(
      "Overflow: contextTokens * layers * kvHeads * headDim * 2 * kvElementBytes",
    );
  }

  const product = step5 * parallelSequences;
  if (!Number.isSafeInteger(product)) {
    throw invalidNumericInput("Overflow: final KV-cache product not safe integer");
  }

  return safeCeil(product);
}
