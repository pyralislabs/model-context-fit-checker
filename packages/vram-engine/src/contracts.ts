import { z } from "zod";

export const ModelId = z.string().min(1);
export type ModelId = z.infer<typeof ModelId>;

export const QuantizationId = z.string().min(1);
export type QuantizationId = z.infer<typeof QuantizationId>;

export const RuntimeProfileId = z.enum(["lean", "balanced", "conservative"]);
export type RuntimeProfileId = z.infer<typeof RuntimeProfileId>;

export const KvCacheDtype = z.enum(["fp16", "bf16", "fp32", "q8_0", "q4_0"]);
export type KvCacheDtype = z.infer<typeof KvCacheDtype>;

export const StandaloneForwardRequestSchema = z
  .object({
    model: z.string().min(1),
    quantization: z.string().min(1),
    contextTokens: z.number().int().positive().safe(),
    runtimeProfile: RuntimeProfileId.optional().default("balanced"),
    kvCacheDtype: KvCacheDtype.optional().default("fp16"),
  })
  .strict();

export type StandaloneForwardRequest = z.infer<typeof StandaloneForwardRequestSchema>;

export const StandaloneForwardEstimateSchema = z.object({
  contextTokens: z.number().int().nonnegative().safe(),
  requiredVramBytes: z.number().int().nonnegative().safe(),
  breakdownBytes: z.object({
    weights: z.number().int().nonnegative().safe(),
    kvCache: z.number().int().nonnegative().safe(),
    runtimeFixed: z.number().int().nonnegative().safe(),
    computeBuffer: z.number().int().nonnegative().safe(),
    safetyMargin: z.number().int().nonnegative().safe(),
  }),
  assumptions: z.array(z.string()),
  warnings: z.array(z.string()),
  metadata: z.object({
    packageName: z.string(),
    packageVersion: z.string(),
    assumptionVersion: z.string(),
    datasetVersion: z.string(),
  }),
});

export type StandaloneForwardEstimate = z.infer<typeof StandaloneForwardEstimateSchema>;

export const ModelRecordSchema = z.object({
  id: z.string().min(1),
  aliases: z.array(z.string()),
  displayName: z.string().min(1),
  family: z.string().min(1),
  parameterCount: z.number().int().positive().safe(),
  layers: z.number().int().positive().safe(),
  kvHeads: z.number().int().positive().safe(),
  headDim: z.number().int().positive().safe(),
  declaredMaxContextTokens: z.number().int().positive().safe(),
  sourceIds: z.array(z.string().min(1)),
  reviewedAt: z.string(),
});

export type ModelRecord = z.infer<typeof ModelRecordSchema>;

export const QuantizationRecordSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  effectiveBitsPerWeight: z.number().positive().finite(),
  status: z.enum(["active", "experimental", "deprecated"]),
  notes: z.string(),
  sourceIds: z.array(z.string().min(1)),
  reviewedAt: z.string(),
});

export type QuantizationRecord = z.infer<typeof QuantizationRecordSchema>;

export type RuntimeProfileValues = {
  fixedGiB: number;
  minimumComputeGiB: number;
  weightBufferFraction: number;
  minimumSafetyGiB: number;
  safetyFraction: number;
};

export type KvCacheDtypeInfo = {
  bytesPerElement: number;
  warnIdealized: boolean;
};

export type PublicModelSummary = {
  id: string;
  displayName: string;
  family: string;
  parameterCount: number;
  declaredMaxContextTokens: number;
};

export type PublicQuantizationSummary = {
  id: string;
  displayName: string;
  effectiveBitsPerWeight: number;
  status: string;
};

export type RuntimeProfileSummary = {
  id: string;
  fixedGiB: number;
};

export type KvCacheDtypeSummary = {
  id: string;
  bytesPerElement: number;
};

export const ASSUMPTION_VERSION = "1.0.0";
export const DATASET_VERSION = "1.0.0";
export const PACKAGE_NAME = "@localairigs/model-context-fit-vram-engine";
