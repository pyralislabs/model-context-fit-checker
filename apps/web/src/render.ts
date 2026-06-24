import type {
  ContextFitResultV1,
  NormalizedContextFitInputV1,
} from "@localairigs/model-context-fit-core";

function fmtInt(n: number | null): string {
  return n === null ? "N/A" : Number(n).toLocaleString("en-US");
}

function fmtGiB(bytes: number): string {
  return (bytes / Math.pow(2, 30)).toFixed(2);
}

export function clearResult(
  resultDiv: HTMLElement | null,
  errorDiv: HTMLElement | null,
): void {
  if (resultDiv) {
    resultDiv.hidden = true;
    resultDiv.replaceChildren();
  }
  if (errorDiv) {
    errorDiv.hidden = true;
    errorDiv.replaceChildren();
  }
}

export function renderLoading(resultDiv: HTMLElement | null): void {
  if (!resultDiv) return;
  resultDiv.hidden = false;
  resultDiv.textContent = "Calculating...";
}

export function renderError(errorDiv: HTMLElement | null, message: string): void {
  if (!errorDiv) return;
  errorDiv.hidden = false;
  errorDiv.replaceChildren();
  const p = document.createElement("p");
  p.textContent = message;
  errorDiv.appendChild(p);
}

export function renderResult(
  resultDiv: HTMLElement | null,
  result: ContextFitResultV1,
  _input: NormalizedContextFitInputV1,
): void {
  if (!resultDiv) return;
  resultDiv.hidden = false;
  resultDiv.replaceChildren();

  const container = document.createElement("div");
  container.className = "result-container";

  const header = document.createElement("h2");
  if (result.status === "fits") {
    header.textContent = `Result: ${fmtInt(result.result.maxContextTokens)} tokens fit`;
  } else {
    header.textContent = "Result: Minimum context does not fit";
  }
  container.appendChild(header);

  const table = document.createElement("table");
  table.className = "result-table";

  function addRow(label: string, value: string): void {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = label;
    const td = document.createElement("td");
    td.textContent = value;
    tr.appendChild(th);
    tr.appendChild(td);
    table.appendChild(tr);
  }

  addRow("Model", result.input.model);
  addRow("Quantization", result.input.quantization);
  addRow("GPU VRAM", `${result.input.gpuVramGiB} GiB`);
  addRow("Headroom", `${result.budget.headroomPercent}%`);
  addRow("Usable VRAM", `${fmtGiB(result.budget.usableVramBytes)} GiB`);
  addRow("Model max", fmtInt(result.search.modelMaxContextTokens));
  addRow(
    "Search range",
    `${fmtInt(result.search.alignedMinContextTokens)} – ${fmtInt(result.search.alignedMaxContextTokens)}`,
  );
  addRow("Granularity", fmtInt(result.search.granularity));

  const versionsDetail = document.createElement("details");
  const versionsSummary = document.createElement("summary");
  versionsSummary.textContent = `Provider: ${result.provider.packageName} v${result.provider.packageVersion}`;
  versionsDetail.appendChild(versionsSummary);
  const versionsList = document.createElement("ul");
  const addVersion = (label: string, val: string) => {
    const li = document.createElement("li");
    li.textContent = `${label}: ${val}`;
    versionsList.appendChild(li);
  };
  addVersion("Package version", result.provider.packageVersion);
  addVersion("Assumption version", result.provider.assumptionVersion);
  addVersion("Dataset version", result.provider.datasetVersion);
  versionsDetail.appendChild(versionsList);
  container.appendChild(versionsDetail);

  if (result.status === "fits" && result.result.estimate) {
    addRow("Required VRAM", `${fmtGiB(result.result.estimate.requiredVramBytes)} GiB`);
    addRow(
      "Remaining VRAM",
      `${fmtGiB(result.result.estimate.remainingUsableVramBytes)} GiB`,
    );

    const hasBreakdown = Object.values(result.result.estimate.breakdownBytes).some(
      (v) => v > 0,
    );
    if (hasBreakdown) {
      for (const [key, val] of Object.entries(result.result.estimate.breakdownBytes)) {
        if (val > 0) {
          addRow(`  ${key}`, `${fmtGiB(val)} GiB`);
        }
      }
    }
  }

  container.appendChild(table);

  if (result.status === "fits") {
    const boundary = document.createElement("p");
    boundary.className = "boundary";
    if (result.boundary.kind === "vram") {
      const nextCtx = result.boundary.nextContextTokens;
      const nextEst = result.boundary.nextEstimate;
      const boundaryText = nextEst
        ? `Boundary: next aligned context (${fmtInt(nextCtx)} tokens) requires ${fmtGiB(nextEst.requiredVramBytes)} GiB, exceeding the usable budget of ${fmtGiB(result.budget.usableVramBytes)} GiB.`
        : `Boundary: next aligned context (${fmtInt(nextCtx)} tokens) exceeds the usable budget.`;
      boundary.textContent = boundaryText;
    } else {
      const capLabels: Record<string, string> = {
        model_limit: "Model limit reached",
        caller_limit: "Caller limit reached",
        model_and_caller_limit: "Model and caller limit reached",
      };
      boundary.textContent = capLabels[result.boundary.kind] ?? result.boundary.kind;
    }
    container.appendChild(boundary);
  }

  if (result.status === "minimum_context_does_not_fit") {
    const note = document.createElement("p");
    note.className = "boundary";
    note.textContent = `Even the minimum context (${fmtInt(result.boundary.contextTokens)} tokens) exceeds the usable budget.`;
    container.appendChild(note);
  }

  const dl = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Assumptions";
  dl.appendChild(summary);

  const ul = document.createElement("ul");
  if (result.status === "fits" && result.result.estimate) {
    for (const a of result.result.estimate.assumptions) {
      const li = document.createElement("li");
      li.textContent = a;
      ul.appendChild(li);
    }
  }
  dl.appendChild(ul);
  container.appendChild(dl);

  if (result.warnings.length > 0) {
    const wl = document.createElement("details");
    const ws = document.createElement("summary");
    ws.textContent = "Warnings";
    wl.appendChild(ws);
    const wul = document.createElement("ul");
    for (const w of result.warnings) {
      const li = document.createElement("li");
      li.textContent = w;
      wul.appendChild(li);
    }
    wl.appendChild(wul);
    container.appendChild(wl);
  }

  resultDiv.appendChild(container);
}
