import {
  validateAndNormalizeRequest,
  solveContextFit,
} from "@localairigs/model-context-fit-core";
import type {
  NormalizedContextFitInputV1,
  ContextFitResultV1,
} from "@localairigs/model-context-fit-core";
import {
  StandaloneVramProvider,
  listModels,
  listQuantizations,
  listRuntimeProfiles,
  listKvCacheDtypes,
} from "@localairigs/model-context-fit-vram-engine";
import { renderResult, renderError, renderLoading, clearResult } from "./render.js";

const provider = new StandaloneVramProvider();

function populateSelect(
  selectId: string,
  options: readonly { id: string; displayName?: string }[],
): void {
  const select = document.getElementById(selectId);
  if (!select || !(select instanceof HTMLSelectElement)) return;

  while (select.options.length > 0) {
    select.remove(0);
  }

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = `Select ${selectId}...`;
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  for (const opt of options) {
    const option = document.createElement("option");
    option.value = opt.id;
    option.textContent = opt.displayName ?? opt.id;
    select.appendChild(option);
  }
}

function populateSimpleSelect(
  selectId: string,
  options: readonly { id: string }[],
): void {
  populateSelect(selectId, options);
}

function populateForm(): void {
  const models = listModels();
  populateSelect("model", models);

  const quantizations = listQuantizations();
  populateSelect("quantization", quantizations);

  const profiles = listRuntimeProfiles();
  populateSimpleSelect("runtime-profile", profiles);

  const kvDtypes = listKvCacheDtypes();
  populateSimpleSelect("kv-cache-dtype", kvDtypes);
}

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
  populateForm();

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
      if (errorDiv) {
        errorDiv.focus();
      }
      return;
    }

    try {
      const result: ContextFitResultV1 = await solveContextFit(provider, normalized);
      renderResult(resultDiv, result, normalized);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      renderError(errorDiv, msg);
      if (errorDiv) {
        errorDiv.focus();
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", initForm);
