import { ONE_GIB, ContextFitResultV1Schema } from "./contracts.js";
import type {
  NormalizedContextFitInputV1,
  ResolvedMathConfiguration,
  ForwardEstimate,
  EstimateEvidenceV1,
  BudgetV1,
  SearchRangeV1,
  ContextFitResultV1,
} from "./contracts.js";
import type { MathProvider } from "./math-provider.js";
import {
  SolverError,
  providerFailure,
  providerInvalidResult,
  providerNonMonotone,
  providerInconsistent,
  invalidInput,
  internalError,
} from "./errors.js";

function validateResult<T>(result: T): T {
  const parsed = ContextFitResultV1Schema.safeParse(result);
  if (!parsed.success) {
    throw internalError(`Output validation failed: ${parsed.error.message}`);
  }
  return parsed.data as T;
}

function mergeWarnings(...warningsArrays: string[][]): string[] {
  return [...new Set(warningsArrays.flat())];
}

function guardConsistentProbes(
  cached: ForwardEstimate,
  uncached: ForwardEstimate,
  contextTokens: number,
): void {
  if (uncached.requiredVramBytes !== cached.requiredVramBytes) {
    throw providerInconsistent(
      `Provider returned inconsistent results at ${contextTokens} tokens: ` +
        `cached ${cached.requiredVramBytes} bytes, uncached ${uncached.requiredVramBytes} bytes`,
    );
  }
  if (
    uncached.provider.packageVersion !== cached.provider.packageVersion ||
    uncached.provider.assumptionVersion !== cached.provider.assumptionVersion ||
    uncached.provider.datasetVersion !== cached.provider.datasetVersion
  ) {
    throw providerInconsistent(
      `Provider metadata inconsistent at ${contextTokens} tokens: ` +
        `cached versions (${cached.provider.packageVersion}/${cached.provider.assumptionVersion}/${cached.provider.datasetVersion}), ` +
        `uncached versions (${uncached.provider.packageVersion}/${uncached.provider.assumptionVersion}/${uncached.provider.datasetVersion})`,
    );
  }
}

function guardAllCachedMonotonic(cache: Map<number, ForwardEstimate>): void {
  const sorted = [...cache.entries()].sort(([a], [b]) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    const [, prevEst] = sorted[i - 1]!;
    const [curCtx, curEst] = sorted[i]!;
    if (curEst.requiredVramBytes < prevEst.requiredVramBytes) {
      throw providerNonMonotone(
        `Cached estimates are non-monotone: ` +
          `${prevEst.contextTokens} tok -> ${prevEst.requiredVramBytes} bytes, ` +
          `${curCtx} tok -> ${curEst.requiredVramBytes} bytes`,
      );
    }
  }
}

export function alignUp(value: number, granularity: number): number {
  if (!Number.isSafeInteger(value) || !Number.isSafeInteger(granularity)) {
    throw invalidInput("Alignment requires safe integers");
  }
  if (granularity <= 0) {
    throw invalidInput("Granularity must be positive");
  }
  const result = Math.ceil(value / granularity) * granularity;
  if (!Number.isSafeInteger(result)) {
    throw invalidInput("Alignment overflow");
  }
  return result;
}

export function alignDown(value: number, granularity: number): number {
  if (!Number.isSafeInteger(value) || !Number.isSafeInteger(granularity)) {
    throw invalidInput("Alignment requires safe integers");
  }
  if (granularity <= 0) {
    throw invalidInput("Granularity must be positive");
  }
  const result = Math.floor(value / granularity) * granularity;
  if (!Number.isSafeInteger(result)) {
    throw invalidInput("Alignment overflow");
  }
  return result;
}

export function computeUsableVram(
  gpuVramGiB: number,
  headroomPercent: number,
): { totalVramBytes: number; usableVramBytes: number } {
  const totalVramBytes = Math.floor(gpuVramGiB * ONE_GIB);
  if (!Number.isSafeInteger(totalVramBytes) || totalVramBytes <= 0) {
    throw invalidInput("GPU VRAM conversion to bytes produced unsafe result");
  }
  const usableVramBytes = Math.floor(totalVramBytes * (1 - headroomPercent / 100));
  if (!Number.isSafeInteger(usableVramBytes)) {
    throw invalidInput("Usable VRAM calculation produced unsafe result");
  }
  return { totalVramBytes, usableVramBytes };
}

export function computeAlignedBounds(
  minContextTokens: number,
  maxContextTokens: number | undefined,
  modelMaxContextTokens: number,
  granularity: number,
): {
  rawUpperBoundTokens: number;
  alignedMin: number;
  alignedMax: number;
  candidateCount: number;
} {
  const rawUpperBoundTokens = Math.min(
    modelMaxContextTokens,
    maxContextTokens ?? modelMaxContextTokens,
  );

  const alignedMin = alignUp(minContextTokens, granularity);
  const alignedMax = alignDown(rawUpperBoundTokens, granularity);

  if (alignedMin > alignedMax) {
    throw invalidInput(
      "No aligned context exists in the requested range: minimum exceeds maximum after alignment",
      [
        {
          path: "minContextTokens",
          code: "out_of_range",
          message: `Aligned minimum (${alignedMin}) exceeds aligned maximum (${alignedMax}). Try adjusting granularity, minContextTokens, or maxContextTokens.`,
        },
      ],
    );
  }

  const candidateCount = Math.floor((alignedMax - alignedMin) / granularity) + 1;

  if (!Number.isSafeInteger(candidateCount) || candidateCount < 1) {
    throw invalidInput("Candidate count is not a valid positive integer");
  }

  return { rawUpperBoundTokens, alignedMin, alignedMax, candidateCount };
}

export function computeBudget(input: NormalizedContextFitInputV1): BudgetV1 {
  const { totalVramBytes, usableVramBytes } = computeUsableVram(
    input.gpuVramGiB,
    input.headroomPercent,
  );
  return {
    totalVramBytes,
    totalVramGiB: totalVramBytes / ONE_GIB,
    headroomPercent: input.headroomPercent,
    usableVramBytes,
    usableVramGiB: usableVramBytes / ONE_GIB,
  };
}

function toEstimateEvidence(
  estimate: ForwardEstimate,
  usableVramBytes: number,
): EstimateEvidenceV1 {
  return {
    contextTokens: estimate.contextTokens,
    requiredVramBytes: estimate.requiredVramBytes,
    requiredVramGiB: estimate.requiredVramBytes / ONE_GIB,
    remainingUsableVramBytes: usableVramBytes - estimate.requiredVramBytes,
    remainingUsableVramGiB: (usableVramBytes - estimate.requiredVramBytes) / ONE_GIB,
    breakdownBytes: { ...estimate.breakdownBytes },
    assumptions: [...estimate.assumptions],
    warnings: [...estimate.warnings],
  };
}

function guardForwardEstimate(
  estimate: ForwardEstimate,
  resolvedConfig: ResolvedMathConfiguration,
  expectedContext: number,
): void {
  if (
    typeof estimate.contextTokens !== "number" ||
    !Number.isSafeInteger(estimate.contextTokens) ||
    estimate.contextTokens < 0
  ) {
    throw providerInvalidResult(
      `Invalid contextTokens: ${String(estimate.contextTokens)}`,
    );
  }
  if (estimate.contextTokens !== expectedContext) {
    throw providerInvalidResult(
      `Provider returned context ${estimate.contextTokens} but expected ${expectedContext}`,
    );
  }
  if (
    typeof estimate.requiredVramBytes !== "number" ||
    !Number.isSafeInteger(estimate.requiredVramBytes) ||
    estimate.requiredVramBytes < 0
  ) {
    throw providerInvalidResult(
      `Invalid requiredVramBytes: ${String(estimate.requiredVramBytes)}`,
    );
  }
  if (
    typeof estimate.provider.packageVersion !== "string" ||
    typeof estimate.provider.assumptionVersion !== "string" ||
    typeof estimate.provider.datasetVersion !== "string"
  ) {
    throw providerInvalidResult("Provider metadata missing version fields");
  }
  if (
    estimate.provider.packageName !== resolvedConfig.provider.packageName ||
    estimate.provider.packageVersion !== resolvedConfig.provider.packageVersion ||
    estimate.provider.assumptionVersion !== resolvedConfig.provider.assumptionVersion ||
    estimate.provider.datasetVersion !== resolvedConfig.provider.datasetVersion
  ) {
    throw providerInconsistent("Provider metadata changed during solve");
  }
}

function guardMonotonePair(
  lowerEstimate: ForwardEstimate,
  upperContext: number,
  upperEstimate: ForwardEstimate,
): void {
  if (upperEstimate.requiredVramBytes < lowerEstimate.requiredVramBytes) {
    throw providerNonMonotone(
      `Provider returned non-monotone estimates: ` +
        `${lowerEstimate.contextTokens} tok -> ${lowerEstimate.requiredVramBytes} bytes, ` +
        `${upperContext} tok -> ${upperEstimate.requiredVramBytes} bytes`,
    );
  }
}

function computeSearchRange(
  input: NormalizedContextFitInputV1,
  resolvedConfig: ResolvedMathConfiguration,
): SearchRangeV1 {
  const bounds = computeAlignedBounds(
    input.minContextTokens,
    input.maxContextTokens,
    resolvedConfig.modelMaxContextTokens,
    input.contextGranularity,
  );

  return {
    requestedMinContextTokens: input.minContextTokens,
    requestedMaxContextTokens: input.maxContextTokens ?? null,
    modelMaxContextTokens: resolvedConfig.modelMaxContextTokens,
    rawUpperBoundTokens: bounds.rawUpperBoundTokens,
    alignedMinContextTokens: bounds.alignedMin,
    alignedMaxContextTokens: bounds.alignedMax,
    granularity: input.contextGranularity,
  };
}

async function probe(
  provider: MathProvider,
  resolvedConfig: ResolvedMathConfiguration,
  contextTokens: number,
): Promise<ForwardEstimate> {
  let estimate: ForwardEstimate;
  try {
    const result = provider.estimateRequiredVram({
      ...resolvedConfig,
      contextTokens,
    });
    estimate = await Promise.resolve(result);
  } catch (err) {
    throw providerFailure(
      `Provider error at ${contextTokens} tokens: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  guardForwardEstimate(estimate, resolvedConfig, contextTokens);
  return estimate;
}

function computeCapKind(
  searchRange: SearchRangeV1,
  input: NormalizedContextFitInputV1,
  fitContext: number,
): "model_limit" | "caller_limit" | "model_and_caller_limit" {
  const atEffectiveMax = fitContext === searchRange.alignedMaxContextTokens;
  if (!atEffectiveMax) return "model_limit";

  const modelLimited =
    searchRange.rawUpperBoundTokens === searchRange.modelMaxContextTokens;
  const callerLimited =
    input.maxContextTokens !== undefined &&
    searchRange.rawUpperBoundTokens === input.maxContextTokens;

  if (modelLimited && callerLimited) return "model_and_caller_limit";
  if (callerLimited) return "caller_limit";
  if (modelLimited) return "model_limit";
  return "model_limit";
}

export async function solveContextFit(
  provider: MathProvider,
  input: NormalizedContextFitInputV1,
): Promise<ContextFitResultV1> {
  let resolvedConfig: ResolvedMathConfiguration;
  try {
    const result = provider.resolveConfiguration({
      model: input.model,
      quantization: input.quantization,
      runtimeProfile: input.runtimeProfile,
      kvCacheDtype: input.kvCacheDtype,
    });
    resolvedConfig = await Promise.resolve(result);
  } catch (err) {
    const msg =
      err instanceof SolverError
        ? err.message
        : `Provider configuration resolution failed: ${err instanceof Error ? err.message : String(err)}`;
    throw err instanceof SolverError ? err : providerFailure(msg);
  }

  if (
    !Number.isSafeInteger(resolvedConfig.modelMaxContextTokens) ||
    resolvedConfig.modelMaxContextTokens < 1
  ) {
    throw providerInvalidResult(
      `Invalid model max context tokens: ${String(resolvedConfig.modelMaxContextTokens)}`,
    );
  }

  const canonicalInput: NormalizedContextFitInputV1 = {
    ...input,
    model: resolvedConfig.model,
    quantization: resolvedConfig.quantization,
    runtimeProfile: resolvedConfig.runtimeProfile ?? input.runtimeProfile,
    kvCacheDtype: resolvedConfig.kvCacheDtype ?? input.kvCacheDtype,
  };

  const budget = computeBudget(input);
  const searchRange = computeSearchRange(input, resolvedConfig);
  const usableVramBytes = budget.usableVramBytes;
  const granularity = searchRange.granularity;

  const cache = new Map<number, ForwardEstimate>();

  const probeCalls = {
    count: 0,
    max: 0,
  };

  const candidateCount =
    searchRange.alignedMaxContextTokens >= searchRange.alignedMinContextTokens
      ? Math.floor(
          (searchRange.alignedMaxContextTokens - searchRange.alignedMinContextTokens) /
            granularity,
        ) + 1
      : 0;

  if (candidateCount < 1) {
    throw internalError(
      "Candidate count is zero after alignment (should have been caught earlier)",
    );
  }

  probeCalls.max = Math.ceil(Math.log2(candidateCount)) + 4;

  async function getCachedProbe(contextTokens: number): Promise<ForwardEstimate> {
    const cached = cache.get(contextTokens);
    if (cached !== undefined) return cached;
    probeCalls.count++;
    if (probeCalls.count > probeCalls.max) {
      throw internalError(
        `Exceeded maximum probe calls: ${probeCalls.count} > ${probeCalls.max}`,
      );
    }
    const estimate = await probe(provider, resolvedConfig, contextTokens);
    cache.set(contextTokens, estimate);
    return estimate;
  }

  async function getUncachedProbe(contextTokens: number): Promise<ForwardEstimate> {
    probeCalls.count++;
    if (probeCalls.count > probeCalls.max) {
      throw internalError(
        `Exceeded maximum probe calls: ${probeCalls.count} > ${probeCalls.max}`,
      );
    }
    return probe(provider, resolvedConfig, contextTokens);
  }

  const minEstimate = await getCachedProbe(searchRange.alignedMinContextTokens);

  if (minEstimate.requiredVramBytes > usableVramBytes) {
    const finalEstimate = await getUncachedProbe(searchRange.alignedMinContextTokens);
    guardConsistentProbes(
      minEstimate,
      finalEstimate,
      searchRange.alignedMinContextTokens,
    );

    guardAllCachedMonotonic(cache);

    return validateResult({
      schemaVersion: "1",
      status: "minimum_context_does_not_fit",
      input: { ...canonicalInput },
      budget,
      search: searchRange,
      provider: { ...resolvedConfig.provider },
      warnings: mergeWarnings(minEstimate.warnings, finalEstimate.warnings),
      result: { maxContextTokens: null, estimate: null },
      boundary: {
        kind: "minimum_context",
        contextTokens: searchRange.alignedMinContextTokens,
        estimate: toEstimateEvidence(finalEstimate, usableVramBytes),
      },
    });
  }

  const maxEstimate = await getCachedProbe(searchRange.alignedMaxContextTokens);

  if (maxEstimate.requiredVramBytes <= usableVramBytes) {
    guardMonotonePair(minEstimate, searchRange.alignedMaxContextTokens, maxEstimate);

    const fitContext = searchRange.alignedMaxContextTokens;
    const kind = computeCapKind(searchRange, input, fitContext);

    const finalEstimate = await getUncachedProbe(fitContext);
    guardConsistentProbes(maxEstimate, finalEstimate, fitContext);

    guardAllCachedMonotonic(cache);

    return validateResult({
      schemaVersion: "1",
      status: "fits",
      input: { ...canonicalInput },
      budget,
      search: searchRange,
      provider: { ...resolvedConfig.provider },
      warnings: mergeWarnings(
        minEstimate.warnings,
        maxEstimate.warnings,
        finalEstimate.warnings,
      ),
      result: {
        maxContextTokens: fitContext,
        estimate: toEstimateEvidence(finalEstimate, usableVramBytes),
      },
      boundary: {
        kind,
        nextContextTokens: null,
        nextEstimate: null,
      },
    });
  }

  const stepCount =
    searchRange.alignedMaxContextTokens - searchRange.alignedMinContextTokens;
  if (stepCount === granularity) {
    const maxEst = await getUncachedProbe(searchRange.alignedMaxContextTokens);
    const minEst = await getUncachedProbe(searchRange.alignedMinContextTokens);
    guardConsistentProbes(minEstimate, minEst, searchRange.alignedMinContextTokens);
    guardConsistentProbes(maxEstimate, maxEst, searchRange.alignedMaxContextTokens);

    guardMonotonePair(minEst, searchRange.alignedMaxContextTokens, maxEst);

    guardAllCachedMonotonic(cache);

    return validateResult({
      schemaVersion: "1",
      status: "fits",
      input: { ...canonicalInput },
      budget,
      search: searchRange,
      provider: { ...resolvedConfig.provider },
      warnings: mergeWarnings(minEstimate.warnings, minEst.warnings, maxEst.warnings),
      result: {
        maxContextTokens: searchRange.alignedMinContextTokens,
        estimate: toEstimateEvidence(minEst, usableVramBytes),
      },
      boundary: {
        kind: "vram",
        nextContextTokens: searchRange.alignedMaxContextTokens,
        nextEstimate: toEstimateEvidence(maxEst, usableVramBytes),
      },
    });
  }

  let lowIdx = 0;
  let highIdx = Math.floor(
    (searchRange.alignedMaxContextTokens - searchRange.alignedMinContextTokens) /
      granularity,
  );

  while (lowIdx < highIdx) {
    const midIdx = Math.ceil((lowIdx + highIdx) / 2);
    const midContext = searchRange.alignedMinContextTokens + midIdx * granularity;
    const midEstimate = await getCachedProbe(midContext);

    const lowContext = searchRange.alignedMinContextTokens + lowIdx * granularity;
    const lowEstimate = await getCachedProbe(lowContext);
    guardMonotonePair(lowEstimate, midContext, midEstimate);

    if (midEstimate.requiredVramBytes <= usableVramBytes) {
      lowIdx = midIdx;
    } else {
      highIdx = midIdx - 1;
    }
  }

  const fitContext = searchRange.alignedMinContextTokens + lowIdx * granularity;
  const fitEstimate = await getCachedProbe(fitContext);

  const nextIdx = lowIdx + 1;
  const nextContext = searchRange.alignedMinContextTokens + nextIdx * granularity;

  const finalFitEstimate = await getUncachedProbe(fitContext);
  guardConsistentProbes(fitEstimate, finalFitEstimate, fitContext);

  guardAllCachedMonotonic(cache);

  if (nextContext <= searchRange.alignedMaxContextTokens) {
    const finalNextEstimate = await getUncachedProbe(nextContext);

    return validateResult({
      schemaVersion: "1",
      status: "fits",
      input: { ...canonicalInput },
      budget,
      search: searchRange,
      provider: { ...resolvedConfig.provider },
      warnings: mergeWarnings(
        fitEstimate.warnings,
        finalFitEstimate.warnings,
        finalNextEstimate.warnings,
      ),
      result: {
        maxContextTokens: fitContext,
        estimate: toEstimateEvidence(finalFitEstimate, usableVramBytes),
      },
      boundary: {
        kind: "vram",
        nextContextTokens: nextContext,
        nextEstimate: toEstimateEvidence(finalNextEstimate, usableVramBytes),
      },
    });
  }

  const kind = computeCapKind(searchRange, input, fitContext);

  const boundaryWarnings: string[] = [];

  if (nextContext <= searchRange.alignedMaxContextTokens) {
    const boundaryProbe = await getUncachedProbe(nextContext);
    boundaryWarnings.push(...boundaryProbe.warnings);
  }

  return validateResult({
    schemaVersion: "1",
    status: "fits",
    input: { ...canonicalInput },
    budget,
    search: searchRange,
    provider: { ...resolvedConfig.provider },
    warnings: mergeWarnings(
      fitEstimate.warnings,
      finalFitEstimate.warnings,
      boundaryWarnings,
    ),
    result: {
      maxContextTokens: fitContext,
      estimate: toEstimateEvidence(finalFitEstimate, usableVramBytes),
    },
    boundary: {
      kind,
      nextContextTokens: null,
      nextEstimate: null,
    },
  });
}
