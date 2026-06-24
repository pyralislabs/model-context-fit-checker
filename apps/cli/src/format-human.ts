import type {
  ContextFitResultV1,
  NormalizedContextFitInputV1,
} from "@localairigs/model-context-fit-core";

function fmtGiB(bytes: number): string {
  return (bytes / Math.pow(2, 30)).toFixed(2);
}

function fmtInt(n: number | null): string {
  return n === null ? "N/A" : Number(n).toLocaleString("en-US");
}

export function formatHuman(
  result: ContextFitResultV1,
  input: NormalizedContextFitInputV1,
): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push("Model Context Fit Checker — Result");
  lines.push("=".repeat(60));
  lines.push("");

  lines.push("Input:");
  lines.push(`  Model:               ${input.model}`);
  lines.push(`  Quantization:        ${input.quantization}`);
  lines.push(
    `  GPU VRAM:            ${input.gpuVramGiB} GiB = ${fmtInt(Math.floor(input.gpuVramGiB * Math.pow(2, 30)))} bytes`,
  );
  lines.push(`  Headroom:            ${input.headroomPercent}%`);
  lines.push(`  Min context:         ${fmtInt(input.minContextTokens)}`);
  if (input.maxContextTokens !== undefined) {
    lines.push(`  Max context:         ${fmtInt(input.maxContextTokens)}`);
  }
  lines.push(`  Granularity:         ${fmtInt(input.contextGranularity)}`);
  if (input.runtimeProfile) {
    lines.push(`  Runtime profile:     ${input.runtimeProfile}`);
  }
  if (input.kvCacheDtype) {
    lines.push(`  KV cache dtype:      ${input.kvCacheDtype}`);
  }
  lines.push("");

  lines.push("Budget:");
  lines.push(
    `  Total VRAM:          ${fmtGiB(result.budget.totalVramBytes)} GiB (${fmtInt(result.budget.totalVramBytes)} bytes)`,
  );
  lines.push(`  Headroom reserve:    ${result.budget.headroomPercent}%`);
  lines.push(
    `  Usable VRAM:         ${fmtGiB(result.budget.usableVramBytes)} GiB (${fmtInt(result.budget.usableVramBytes)} bytes)`,
  );
  lines.push("");

  lines.push("Search:");
  lines.push(`  Model max context:   ${fmtInt(result.search.modelMaxContextTokens)}`);
  lines.push(
    `  Aligned range:       ${fmtInt(result.search.alignedMinContextTokens)} — ${fmtInt(result.search.alignedMaxContextTokens)}`,
  );
  lines.push(`  Granularity:         ${fmtInt(result.search.granularity)}`);
  lines.push("");

  lines.push("Provider:");
  lines.push(
    `  Package:             ${result.provider.packageName} v${result.provider.packageVersion}`,
  );
  lines.push(`  Assumptions:         v${result.provider.assumptionVersion}`);
  lines.push(`  Dataset:             v${result.provider.datasetVersion}`);
  lines.push("");

  if (result.status === "fits") {
    lines.push("Result:");
    lines.push(`  Maximum context:     ${fmtInt(result.result.maxContextTokens)} tokens`);
    lines.push(
      `  Required VRAM:       ${fmtGiB(result.result.estimate.requiredVramBytes)} GiB (${fmtInt(result.result.estimate.requiredVramBytes)} bytes)`,
    );
    lines.push(
      `  Remaining VRAM:      ${fmtGiB(result.result.estimate.remainingUsableVramBytes)} GiB (${fmtInt(result.result.estimate.remainingUsableVramBytes)} bytes)`,
    );
    lines.push("");
    lines.push("Breakdown:");
    for (const [key, val] of Object.entries(result.result.estimate.breakdownBytes)) {
      if (val > 0) {
        lines.push(`  ${key.padEnd(20)} ${fmtGiB(val)} GiB (${fmtInt(val)} bytes)`);
      }
    }
    lines.push("");

    if (result.boundary.kind === "vram") {
      lines.push("Boundary (next aligned context does not fit):");
      lines.push(
        `  Next context:        ${fmtInt(result.boundary.nextContextTokens)} tokens`,
      );
      lines.push(
        `  Required VRAM:       ${fmtGiB(result.boundary.nextEstimate.requiredVramBytes)} GiB (${fmtInt(result.boundary.nextEstimate.requiredVramBytes)} bytes)`,
      );
      lines.push(
        `  Over budget by:      ${fmtGiB(-result.boundary.nextEstimate.remainingUsableVramBytes)} GiB (${fmtInt(-result.boundary.nextEstimate.remainingUsableVramBytes)} bytes)`,
      );
    } else {
      const capLabel =
        result.boundary.kind === "model_limit"
          ? "model limit"
          : result.boundary.kind === "caller_limit"
            ? "caller limit"
            : "model and caller limit";
      lines.push(`Boundary: ${capLabel}`);
    }
  } else {
    lines.push("Result: Minimum context does not fit");
    lines.push(`  Minimum context:     ${fmtInt(result.boundary.contextTokens)} tokens`);
    lines.push(
      `  Required VRAM:       ${fmtGiB(result.boundary.estimate.requiredVramBytes)} GiB (${fmtInt(result.boundary.estimate.requiredVramBytes)} bytes)`,
    );
    lines.push(
      `  Over budget by:      ${fmtGiB(-result.boundary.estimate.remainingUsableVramBytes)} GiB (${fmtInt(-result.boundary.estimate.remainingUsableVramBytes)} bytes)`,
    );
  }

  if (result.result.estimate) {
    lines.push("");
    lines.push("Assumptions:");
    for (const a of result.result.estimate.assumptions) {
      lines.push(`  - ${a}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const w of result.warnings) {
      lines.push(`  - ${w}`);
    }
  }

  lines.push("");
  lines.push("-".repeat(60));
  lines.push("This is an estimate derived from canonical VRAM formulas. It is not");
  lines.push("a benchmark, runtime guarantee, or hardware recommendation. Actual");
  lines.push("memory use depends on runtime implementation, driver version, system");
  lines.push("load, and other factors outside the scope of this tool.");
  lines.push("-".repeat(60));

  return lines.join("\n");
}
