# VRAM Engine Contract

## Status

**Active as of June 24, 2026.**

The in-repo VRAM engine (`packages/vram-engine`) is the canonical forward VRAM
estimate provider. No external package dependency is required.

This document supersedes the former `CANONICAL_CONTRACT.md`, which documented
the blocked external `local-llm-vram-calculator` dependency.

## Ownership

`model-context-fit-checker` owns:

- forward required-VRAM formulas (weights, KV-cache, runtime overhead, safety margin)
- model, quantization, runtime profile, and KV-cache dtype catalogs
- assumption definitions, provenance, and version metadata
- the `MathProvider` implementation used in production

It does not own:

- measured hardware performance or benchmarks
- GPU purchase recommendations
- inverse solving (owned by `packages/core`)

## Forward API

The engine exposes a narrow public API:

```ts
export function estimateRequiredVram(
  request: StandaloneForwardRequest,
): StandaloneForwardEstimate;

export function resolveModel(idOrAlias: string): ModelRecord;
export function listModels(): readonly PublicModelSummary[];
export function listQuantizations(): readonly PublicQuantizationSummary[];
export function listRuntimeProfiles(): readonly RuntimeProfileSummary[];
export function listKvCacheDtypes(): readonly KvCacheDtypeSummary[];
```

## Model Resolution

Models are resolved by ID or alias from the static `data/models.json` catalog.
The catalog is loaded at import time and requires no initialization call.

Each model record contains:

- `id` — canonical identifier
- `aliases` — alternative names
- `parameterCount` — total parameters in the architecture
- `layers` — number of transformer layers
- `kvHeads` — number of KV heads
- `headDim` — dimension per attention head
- `declaredMaxContextTokens` — manufacturer-declared maximum context

## Quantization Resolution

Quantizations are resolved from `data/quantizations.json`. Each record
specifies `effectiveBitsPerWeight` used in weight calculations.

## Assumptions

Assumptions are versioned and documented in `data/assumptions.json`. Every
estimate returns deterministic assumption lines tied to the current
`assumptionVersion`.

## Dataset Provenance

All data sources are recorded in `data/provenance.json` with source URLs,
publishers, review dates, and usage notes. Review cadence is documented in
`docs/DATASET_PROVENANCE.md`.

## Versions

| Field               | Source                           |
| ------------------- | -------------------------------- |
| `packageVersion`    | Generated from `package.json`    |
| `assumptionVersion` | `assumptions.json` top-level key |
| `datasetVersion`    | `provenance.json` top-level key  |

## Browser Compatibility

The engine is browser-compatible by construction:

- No `node:fs`, `node:path`, `process`, or network access
- No runtime JSON file reads
- No conditional hidden Node entry point
- Catalog data is bundled as TypeScript constants derived from JSON sources
