import {
  validateAndNormalizeRequest,
  solveContextFit,
} from "@localairigs/model-context-fit-core";
import type {
  NormalizedContextFitInputV1,
  ContextFitResultV1,
} from "@localairigs/model-context-fit-core";
import { LocalLlmVramProvider } from "@localairigs/model-context-fit-canonical-adapter";
import { renderResult, renderError, renderLoading, clearResult } from "./render.js";

const provider = new LocalLlmVramProvider();

function getFormData(form: HTMLFormElement): Record<string, unknown> {
  const data: Record<string, unknown> = {
    schemaVersion: "1",
  };

  const formData = new FormData(form);
  for (const [key, value] of formData) {
    if (value instanceof File) continue;
    const str = value.toString().trim();
    if (str === "") continue;

    if (
      key === "gpuVramGiB" ||
      key === "headroomPercent" ||
      key === "minContextTokens" ||
      key === "maxContextTokens" ||
      key === "contextGranularity"
    ) {
      const num = Number(str);
      if (!Number.isNaN(num)) {
        data[key] = num;
      }
    } else {
      data[key] = str;
    }
  }

  return data;
}

function initForm(): void {
  const form = document.getElementById("input-form");
  if (!form || !(form instanceof HTMLFormElement)) return;

  const resultDiv = document.getElementById("result");
  const errorDiv = document.getElementById("error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    clearResult(resultDiv, errorDiv);
    renderLoading(resultDiv);

    const rawData = getFormData(form);

    let normalized: NormalizedContextFitInputV1;
    try {
      normalized = validateAndNormalizeRequest(rawData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      renderError(errorDiv, msg);
      return;
    }

    try {
      const result: ContextFitResultV1 = await solveContextFit(provider, normalized);
      renderResult(resultDiv, result, normalized);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      renderError(errorDiv, msg);
    }
  });
}

document.addEventListener("DOMContentLoaded", initForm);
