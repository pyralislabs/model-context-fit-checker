import { z } from "zod";

const schemaVersion = z.literal("1");

const positiveSafeInt = z.number().int().positive().safe();
const nonNegativeSafeInt = z.number().int().nonnegative().safe();
const signedSafeInt = z.number().int().safe();

export const HeadroomPercent = z.number().min(0).max(50);
export type HeadroomPercent = z.infer<typeof HeadroomPercent>;

export const ContextFitRequestV1Schema = z
  .object({
    schemaVersion,
    model: z.string().min(1),
    quantization: z.string().min(1),
    gpuVramGiB: z.number().positive().finite(),
    headroomPercent: HeadroomPercent.optional().default(10),
    minContextTokens: positiveSafeInt.optional().default(1),
    maxContextTokens: positiveSafeInt.optional(),
    contextGranularity: positiveSafeInt.optional().default(1),
    runtimeProfile: z.string().optional(),
    kvCacheDtype: z.string().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.maxContextTokens !== undefined && data.minContextTokens !== undefined) {
        return data.maxContextTokens >= data.minContextTokens;
      }
      return true;
    },
    {
      message: "maxContextTokens must be >= minContextTokens",
      path: ["maxContextTokens"],
    },
  )
  .refine(
    (data) => {
      const totalBytes = Math.floor(data.gpuVramGiB * 2 ** 30);
      return Number.isSafeInteger(totalBytes) && totalBytes > 0;
    },
    {
      message: "gpuVramGiB produces unsafe or non-positive byte count",
      path: ["gpuVramGiB"],
    },
  );

export type ContextFitRequestV1 = z.infer<typeof ContextFitRequestV1Schema>;

export const NormalizedContextFitInputV1Schema = z
  .object({
    schemaVersion,
    model: z.string().min(1),
    quantization: z.string().min(1),
    gpuVramGiB: z.number().positive().finite(),
    headroomPercent: HeadroomPercent,
    minContextTokens: positiveSafeInt,
    maxContextTokens: positiveSafeInt.optional(),
    contextGranularity: positiveSafeInt,
    runtimeProfile: z.string().optional(),
    kvCacheDtype: z.string().optional(),
  })
  .strict();

export type NormalizedContextFitInputV1 = z.infer<
  typeof NormalizedContextFitInputV1Schema
>;

export const MathProviderRequestSchema = z
  .object({
    model: z.string().min(1),
    quantization: z.string().min(1),
    runtimeProfile: z.string().optional(),
    kvCacheDtype: z.string().optional(),
  })
  .strict();

export type MathProviderRequest = z.infer<typeof MathProviderRequestSchema>;

export const ResolvedMathConfigurationSchema = z
  .object({
    model: z.string().min(1),
    quantization: z.string().min(1),
    runtimeProfile: z.string().optional(),
    kvCacheDtype: z.string().optional(),
    modelMaxContextTokens: positiveSafeInt,
    units: z.literal("bytes"),
    provider: z.object({
      packageName: z.string(),
      packageVersion: z.string(),
      assumptionVersion: z.string(),
      datasetVersion: z.string(),
    }),
  })
  .strict();

export type ResolvedMathConfiguration = z.infer<typeof ResolvedMathConfigurationSchema>;

export const ForwardEstimateSchema = z
  .object({
    contextTokens: positiveSafeInt,
    requiredVramBytes: nonNegativeSafeInt,
    breakdownBytes: z.record(z.string(), nonNegativeSafeInt),
    assumptions: z.array(z.string()),
    warnings: z.array(z.string()),
    provider: z
      .object({
        packageName: z.string(),
        packageVersion: z.string(),
        assumptionVersion: z.string(),
        datasetVersion: z.string(),
      })
      .strict(),
  })
  .strict();

export type ForwardEstimate = z.infer<typeof ForwardEstimateSchema>;

export const ProviderMetadataV1Schema = z.object({
  packageName: z.string(),
  packageVersion: z.string(),
  assumptionVersion: z.string(),
  datasetVersion: z.string(),
});

export type ProviderMetadataV1 = z.infer<typeof ProviderMetadataV1Schema>;

export const EstimateEvidenceV1Schema = z.object({
  contextTokens: positiveSafeInt,
  requiredVramBytes: nonNegativeSafeInt,
  requiredVramGiB: z.number().nonnegative().finite(),
  remainingUsableVramBytes: signedSafeInt,
  remainingUsableVramGiB: z.number().finite(),
  breakdownBytes: z.record(z.string(), nonNegativeSafeInt),
  assumptions: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type EstimateEvidenceV1 = z.infer<typeof EstimateEvidenceV1Schema>;

export const BudgetV1Schema = z.object({
  totalVramBytes: positiveSafeInt,
  totalVramGiB: z.number().positive().finite(),
  headroomPercent: HeadroomPercent,
  usableVramBytes: nonNegativeSafeInt,
  usableVramGiB: z.number().nonnegative().finite(),
});

export type BudgetV1 = z.infer<typeof BudgetV1Schema>;

export const SearchRangeV1Schema = z.object({
  requestedMinContextTokens: positiveSafeInt,
  requestedMaxContextTokens: positiveSafeInt.nullable(),
  modelMaxContextTokens: positiveSafeInt,
  rawUpperBoundTokens: positiveSafeInt,
  alignedMinContextTokens: positiveSafeInt,
  alignedMaxContextTokens: positiveSafeInt,
  granularity: positiveSafeInt,
});

export type SearchRangeV1 = z.infer<typeof SearchRangeV1Schema>;

const resultBaseV1Schema = z.object({
  schemaVersion,
  input: NormalizedContextFitInputV1Schema,
  budget: BudgetV1Schema,
  search: SearchRangeV1Schema,
  provider: ProviderMetadataV1Schema,
  warnings: z.array(z.string()),
});

export const EstimateEvidenceV1ForBoundarySchema = EstimateEvidenceV1Schema;

const boundaryVramSchema = z.object({
  kind: z.literal("vram"),
  nextContextTokens: positiveSafeInt,
  nextEstimate: EstimateEvidenceV1Schema,
});

const boundaryCapSchema = z.object({
  kind: z.enum(["model_limit", "caller_limit", "model_and_caller_limit"]),
  nextContextTokens: z.null(),
  nextEstimate: z.null(),
});

export const ContextFitSuccessV1Schema = resultBaseV1Schema.extend({
  status: z.literal("fits"),
  result: z.object({
    maxContextTokens: positiveSafeInt,
    estimate: EstimateEvidenceV1Schema,
  }),
  boundary: z.discriminatedUnion("kind", [boundaryVramSchema, boundaryCapSchema]),
});

export type ContextFitSuccessV1 = z.infer<typeof ContextFitSuccessV1Schema>;

export const ContextFitNoFitV1Schema = resultBaseV1Schema.extend({
  status: z.literal("minimum_context_does_not_fit"),
  result: z.object({
    maxContextTokens: z.null(),
    estimate: z.null(),
  }),
  boundary: z.object({
    kind: z.literal("minimum_context"),
    contextTokens: positiveSafeInt,
    estimate: EstimateEvidenceV1Schema,
  }),
});

export type ContextFitNoFitV1 = z.infer<typeof ContextFitNoFitV1Schema>;

export const ContextFitResultV1Schema = z.discriminatedUnion("status", [
  ContextFitSuccessV1Schema,
  ContextFitNoFitV1Schema,
]);

export type ContextFitResultV1 = ContextFitSuccessV1 | ContextFitNoFitV1;

export const IssueSchema = z.object({
  path: z.string(),
  code: z.string(),
  message: z.string(),
});

export const ErrorResultV1Schema = z.object({
  schemaVersion,
  error: z.object({
    code: z.enum([
      "INVALID_INPUT",
      "UNSUPPORTED_SCHEMA_VERSION",
      "UNSUPPORTED_MODEL",
      "UNSUPPORTED_QUANTIZATION",
      "UNSUPPORTED_RUNTIME_PROFILE",
      "UNSUPPORTED_KV_CACHE_DTYPE",
      "MATH_PROVIDER_FAILURE",
      "MATH_PROVIDER_INVALID_RESULT",
      "MATH_PROVIDER_NON_MONOTONE",
      "MATH_PROVIDER_INCONSISTENT",
      "INTERNAL_ERROR",
    ]),
    message: z.string(),
    issues: z.array(IssueSchema).optional(),
  }),
});

export type ErrorResultV1 = z.infer<typeof ErrorResultV1Schema>;

export const ONE_GIB = 2 ** 30;
