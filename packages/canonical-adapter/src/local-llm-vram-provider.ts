import type {
  MathProvider,
  MathProviderRequest,
  ResolvedMathConfiguration,
  ForwardEstimate,
} from "@localairigs/model-context-fit-core";
import { estimateVram, getModel } from "local-llm-vram-calculator";

const PACKAGE_NAME = "local-llm-vram-calculator";

function resolvePackageVersion(): string {
  try {
    return "0.0.1";
  } catch {
    return "unknown";
  }
}

export class LocalLlmVramProvider implements MathProvider {
  readonly packageName = PACKAGE_NAME;
  readonly packageVersion: string;

  constructor() {
    this.packageVersion = resolvePackageVersion();
  }

  resolveConfiguration(input: MathProviderRequest): ResolvedMathConfiguration {
    const modelRecord = getModel(input.model);
    if (!modelRecord) {
      throw new SolverErrorAdapter(
        "UNSUPPORTED_MODEL",
        `Unsupported model: ${input.model}`,
      );
    }

    if (
      !Number.isSafeInteger(modelRecord.declaredMaxContextTokens) ||
      modelRecord.declaredMaxContextTokens < 1
    ) {
      throw new SolverErrorAdapter(
        "MATH_PROVIDER_INVALID_RESULT",
        `Model ${input.model} has invalid or missing declaredMaxContextTokens`,
      );
    }

    return {
      model: modelRecord.id,
      quantization: input.quantization,
      runtimeProfile: input.runtimeProfile,
      kvCacheDtype: input.kvCacheDtype,
      modelMaxContextTokens: modelRecord.declaredMaxContextTokens,
      units: "bytes",
      provider: {
        packageName: PACKAGE_NAME,
        packageVersion: this.packageVersion,
        assumptionVersion: "1.0.0",
        datasetVersion: "1.0.0",
      },
    };
  }

  estimateRequiredVram(
    input: ResolvedMathConfiguration & { contextTokens: number },
  ): ForwardEstimate {
    const canonicalInput: Record<string, unknown> = {
      modelId: input.model,
      quantization: input.quantization,
      contextTokens: input.contextTokens,
    };
    if (input.runtimeProfile !== undefined) {
      canonicalInput.runtimeProfile = input.runtimeProfile;
    }
    if (input.kvCacheDtype !== undefined) {
      canonicalInput.kvCacheDtype = input.kvCacheDtype;
    }
    const result = estimateVram(
      canonicalInput as unknown as Parameters<typeof estimateVram>[0],
    );

    return {
      contextTokens: input.contextTokens,
      requiredVramBytes: result.bytes.required,
      breakdownBytes: {
        weights: result.bytes.weights,
        kvCache: result.bytes.kvCache,
        runtimeFixed: result.bytes.runtimeFixed,
        computeBuffer: result.bytes.computeBuffer,
        safetyMargin: result.bytes.safetyMargin,
      },
      assumptions: [
        `Assumption version: ${result.assumptionVersion}`,
        `Dataset version: ${result.datasetVersion}`,
      ],
      warnings: result.warnings,
      provider: {
        packageName: PACKAGE_NAME,
        packageVersion: this.packageVersion,
        assumptionVersion: result.assumptionVersion,
        datasetVersion: result.datasetVersion,
      },
    };
  }
}

class SolverErrorAdapter extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "SolverErrorAdapter";
    this.code = code;
  }
}
