export { ContextFitRequestV1Schema } from "./contracts.js";
export type {
  ContextFitRequestV1,
  NormalizedContextFitInputV1,
  MathProviderRequest,
  ResolvedMathConfiguration,
  ForwardEstimate,
  ProviderMetadataV1,
  EstimateEvidenceV1,
  BudgetV1,
  SearchRangeV1,
  ContextFitResultV1,
  ContextFitSuccessV1,
  ContextFitNoFitV1,
  ErrorResultV1,
  HeadroomPercent,
} from "./contracts.js";
export { ONE_GIB } from "./contracts.js";

export {
  SolverError,
  unsupportedSchemaVersion,
  invalidInput,
  unsupportedModel,
  unsupportedQuantization,
  unsupportedRuntimeProfile,
  unsupportedKvCacheDtype,
  providerFailure,
  providerInvalidResult,
  providerNonMonotone,
  providerInconsistent,
  internalError,
} from "./errors.js";
export type { ErrorCode } from "./errors.js";

export type { MathProvider } from "./math-provider.js";

export {
  alignUp,
  alignDown,
  computeUsableVram,
  computeAlignedBounds,
  computeBudget,
  solveContextFit,
} from "./solve.js";

export {
  validateAndNormalizeRequest,
  parseJsonInput,
  validateErrorResultShape,
} from "./validate.js";
