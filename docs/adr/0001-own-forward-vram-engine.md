# ADR 1: Own the Forward VRAM Engine

## Status

Accepted (2026-06-24). Supersedes the external-dependency approach in the
original `bootstrap.md` and `docs/CANONICAL_CONTRACT.md`.

## Context

The original architecture required `local-llm-vram-calculator` as the sole
canonical source of forward VRAM formulas, model catalogs, and assumptions.
This external package was never published to npm, had an empty catalog by
default, and lacked several required API features.

The project could not complete its release gates while depending on an
unpublished package. Every milestone was blocked on an upstream contract
that did not exist.

## Decision

Make `model-context-fit-checker` the owner of the narrow forward VRAM estimate
required to solve the context-fit problem. Move the formula implementation,
model/quantization data, and assumptions into a new `packages/vram-engine`
workspace package.

### What this means

- `packages/vram-engine` implements the forward formulas documented in the
  migration plan (weights, KV-cache, runtime overhead, safety margin).
- Model and quantization catalogs are JSON files validated by schema and CI.
- Assumptions and provenance are versioned and documented.
- The `StandaloneVramProvider` provides the production `MathProvider`.
- `packages/canonical-adapter` is deleted.

### What this does NOT mean

- GPU recommendations, benchmarks, or hardware performance claims.
- A second inverse solver (core still owns that).
- Runtime network dependencies, telemetry, or storage.

## Consequences

Positive:
- The project can build, test, and release independently.
- Formula and dataset changes are reviewable, versioned, and protected by tests.
- All release gates can run from a clean checkout.

Negative:
- The project must now maintain model/quantization data that was previously
  owned by an external package.
- Catalog freshness requires active review and updates.

## References

- `docs/VRAM_ENGINE_CONTRACT.md`
- `bootstrap.md` (updated)
- `no-local-llm.md` (migration plan)
