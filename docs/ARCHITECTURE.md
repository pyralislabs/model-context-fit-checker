# Architecture

## System Shape

`model-context-fit-checker` is a static, deterministic inverse solver with three
public surfaces:

```text
CLI --------\
              -> core solver -> MathProvider -> vram-engine
Static web -/
Library ----/
```

There is no backend. The Node CLI and browser app use the same core contracts
and solver.

## Component Responsibilities

### `packages/core`

Owns:

- request/result/error schemas
- validation of inverse-solving inputs
- usable-budget calculation
- aligned integer binary search
- monotonicity and provider-result guards
- stable public result semantics

It must not import catalog data or formula modules. It depends only on the
`MathProvider` interface so the solver is testable and package ownership stays
clear.

### `packages/vram-engine`

Owns:

- exact model and alias resolution
- quantization resolution
- runtime-profile resolution
- KV-cache dtype resolution
- the narrow forward estimate required by `MathProvider`
- model, quantization, assumptions, and provenance datasets
- assumption and dataset versions
- a generated runtime package version
- `StandaloneVramProvider`, the production `MathProvider` implementation
- browser-safe static imports with no filesystem or network access

### `apps/cli`

Owns argument/file/stdin parsing, stdout/stderr behavior, human formatting, and
exit-code mapping. It delegates validation and solving to core.

### `apps/web`

Owns accessible form controls and browser presentation. It imports core and the
browser-compatible vram-engine. It has no runtime network calls.

## Data Flow

1. A surface collects a `ContextFitRequestV1`.
2. Core strictly validates and normalizes defaults.
3. Core asks the provider to resolve canonical IDs, version metadata, and the
   finite declared model context limit before search.
4. Core converts the caller capacity and headroom to an exact integer-byte
   budget and aligns the bounded candidate domain.
5. Core probes the provider while performing aligned integer binary search.
6. Core verifies the final fitting boundary and returns `ContextFitResultV1`.
7. The surface formats the result without changing its meaning.

## Solver Invariants

- Candidate contexts are positive safe integers aligned to granularity.
- The provider receives only validated inputs.
- Provider estimates must correspond to the requested context.
- Required VRAM must be a non-negative safe-integer byte count and
  non-decreasing for a fixed resolved configuration.
- The final fitting candidate satisfies the budget comparison.
- The next candidate exceeds the budget unless a stated upper limit caps the
  result.
- Calculations use unrounded values; rounding is presentation-only.

## Failure Boundaries

Validation failures are user errors. Unsupported canonical values are stable
user-facing errors. Provider exceptions, malformed provider results, and
non-monotone estimates are provider failures. Unexpected faults are internal
errors with no default stack-trace disclosure.

## Dependency Direction

Allowed:

```text
apps/* -> packages/core
apps/* -> packages/vram-engine
packages/vram-engine -> packages/core (runtime dependency via Schema imports)
```

Forbidden:

```text
packages/core -> apps/*
packages/core -> packages/vram-engine (no catalog/formula imports)
packages/core -> external VRAM calculators
```

## Deployment Architecture

- CLI/library: npm packages built from TypeScript ESM.
- Web: Vite static assets on Cloudflare Pages.
- Runtime data: bundled vram-engine data only.
- Runtime services: none.

## Architectural Change Rule

Any change that adds a backend, changes JSON semantics, or expands into
recommendations requires an explicit documented decision and roadmap revision
before implementation.
