import type {
  MathProviderRequest,
  ResolvedMathConfiguration,
  ForwardEstimate,
} from "./contracts.js";

export interface MathProvider {
  resolveConfiguration(
    input: MathProviderRequest,
  ): Promise<ResolvedMathConfiguration> | ResolvedMathConfiguration;

  estimateRequiredVram(
    input: ResolvedMathConfiguration & { contextTokens: number },
  ): Promise<ForwardEstimate> | ForwardEstimate;
}
