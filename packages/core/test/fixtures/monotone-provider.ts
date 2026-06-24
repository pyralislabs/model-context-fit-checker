import type {
  MathProvider,
  MathProviderRequest,
  ResolvedMathConfiguration,
  ForwardEstimate,
} from "../../src/index.js";

export interface MonotoneProviderOptions {
  model?: string;
  quantization?: string;
  modelMaxContextTokens?: number;
  baseVramBytes?: number;
  bytesPerToken?: number;
  packageName?: string;
  packageVersion?: string;
  assumptionVersion?: string;
  datasetVersion?: string;
  throwOnResolve?: boolean;
  throwOnEstimate?: boolean;
  estimateOverrides?: Map<number, Partial<ForwardEstimate>>;
}

export class MonotoneProvider implements MathProvider {
  readonly options: Required<MonotoneProviderOptions>;

  constructor(opts: MonotoneProviderOptions = {}) {
    this.options = {
      model: opts.model ?? "test-model",
      quantization: opts.quantization ?? "q4_k_m",
      modelMaxContextTokens: opts.modelMaxContextTokens ?? 131072,
      baseVramBytes: opts.baseVramBytes ?? 1_000_000_000,
      bytesPerToken: opts.bytesPerToken ?? 100_000,
      packageName: opts.packageName ?? "test-package",
      packageVersion: opts.packageVersion ?? "0.0.1",
      assumptionVersion: opts.assumptionVersion ?? "1.0.0",
      datasetVersion: opts.datasetVersion ?? "1.0.0",
      throwOnResolve: opts.throwOnResolve ?? false,
      throwOnEstimate: opts.throwOnEstimate ?? false,
      estimateOverrides: opts.estimateOverrides ?? new Map(),
    };
  }

  resolveConfiguration(input: MathProviderRequest): ResolvedMathConfiguration {
    if (this.options.throwOnResolve) {
      throw new Error("Provider resolution failed");
    }
    return {
      model: input.model,
      quantization: input.quantization,
      runtimeProfile: input.runtimeProfile,
      kvCacheDtype: input.kvCacheDtype,
      modelMaxContextTokens: this.options.modelMaxContextTokens,
      units: "bytes",
      provider: {
        packageName: this.options.packageName,
        packageVersion: this.options.packageVersion,
        assumptionVersion: this.options.assumptionVersion,
        datasetVersion: this.options.datasetVersion,
      },
    };
  }

  estimateRequiredVram(
    input: ResolvedMathConfiguration & { contextTokens: number },
  ): ForwardEstimate {
    if (this.options.throwOnEstimate) {
      throw new Error("Provider estimate failed");
    }

    const base = this.options.baseVramBytes;
    const perToken = this.options.bytesPerToken;
    const requiredVramBytes = base + input.contextTokens * perToken;

    const estimate: ForwardEstimate = {
      contextTokens: input.contextTokens,
      requiredVramBytes,
      breakdownBytes: {
        weights: base,
        kvCache: input.contextTokens * perToken,
        runtimeFixed: 0,
        computeBuffer: 0,
        safetyMargin: 0,
      },
      assumptions: ["Weights loaded in full", "KV cache uses estimated size"],
      warnings: [],
      provider: {
        packageName: this.options.packageName,
        packageVersion: this.options.packageVersion,
        assumptionVersion: this.options.assumptionVersion,
        datasetVersion: this.options.datasetVersion,
      },
    };

    const overrides = this.options.estimateOverrides.get(input.contextTokens);
    if (overrides) {
      return { ...estimate, ...overrides, contextTokens: input.contextTokens };
    }

    return estimate;
  }
}
