# Testing Strategy

## Testing Goal

Prove that the tool returns the largest valid aligned context, exposes the
decision boundary, fails safely when assumptions break, and keeps library, CLI,
and web semantics consistent.

## Test Layers

### Core unit tests

Use deterministic fake `MathProvider` implementations. Test validation,
zero-origin alignment, exact byte-budget calculation, binary search, cap
selection, errors, provider consistency, and provider-call bounds.

### Property tests

Generate monotone forward functions and valid request ranges. For every result:

- returned context fits
- no larger aligned context up to the effective upper bound fits
- the next context is non-fitting unless the result is capped
- increasing VRAM never decreases maximum context
- increasing headroom never increases maximum context
- increasing the caller upper bound never lowers an otherwise unchanged result
- tightening granularity returns an aligned result and never exceeds the exact
  granularity-1 solution

### VRAM engine unit tests

- weight formula exact values and overflow
- KV-cache formula for each dtype
- runtime fixed/minimum/fraction branches for every profile
- safety-margin minimum/fraction branches
- exact total breakdown
- invalid and unsafe numeric inputs
- deterministic assumptions/warnings
- quantized-KV warning behavior
- unknown model/quant/profile/KV errors
- alias resolution and canonical IDs
- repeated result deep equality

### Dataset tests

- strict schema validation
- no duplicate normalized IDs/aliases
- no alias-to-ID collisions
- every provenance reference resolves
- review dates are valid and current
- versions agree across manifests
- all numeric fields are positive and safe
- list order is deterministic

### CLI contract tests

Spawn the built CLI and verify:

- direct flags, JSON file, and stdin modes
- mutual-exclusion failures
- stable one-object JSON output
- human output includes boundary evidence and disclaimer
- diagnostics use stderr
- exit codes match `bootstrap.md`
- `NO_COLOR` and non-TTY output contain no ANSI
- malformed and oversized input fails safely

### Web tests

Test form validation, successful result, no-fit result, provider failure, focus
management, accessible names, keyboard use, and visible disclaimer/backlinks.
Smoke-test the production static build with network access disabled after local
assets load.

## Required Boundary Cases

- minimum context does not fit
- minimum context exactly fits
- upper bound exactly fits
- next aligned context exceeds the byte budget by exactly one byte
- caller cap below model cap
- model cap below caller cap
- equal caller and model caps
- granularity larger than the candidate range
- non-divisible lower and upper bounds
- headroom at 0 and 50 percent
- very small and large safe-integer contexts
- provider returns a missing, non-positive, or unsafe model limit
- provider throws
- provider returns non-integer/unsafe/negative bytes, wrong context, or missing
  version metadata
- provider is non-monotone

## Numeric Exactness Tests

- Compare integer provider bytes, not displayed GiB values.
- Test exact-fit and one-byte-over-budget boundaries.
- Test GiB-to-byte conversion and headroom flooring exactly.
- Confirm human rounding cannot change JSON or fit status.
- Confirm repeated identical requests produce deep-equal results.
- Confirm solver call count stays within the documented logarithmic bound.

## Coverage Gates

Coverage thresholds are enforced at the root level in `vitest.config.ts` and
at the per-package level in each project's `vitest.config.ts`:

| Package                | Statements | Branches | Functions | Lines |
| ---------------------- | ---------: | -------: | --------: | ----: |
| Root (global)          |        60% |      50% |       40% |   60% |
| `packages/core`        |        80% |      70% |       70% |   80% |
| `packages/vram-engine` |        80% |      60% |       60% |   80% |
| `apps/cli`             |        50% |      40% |       30% |   50% |
| `apps/web`             |        60% |      40% |       40% |   60% |

The project's aspirational targets for v1 completeness are:

- `packages/core`: 100% branch coverage for solver and validation modules
- `packages/vram-engine`: 90% line and branch coverage, plus mandatory
  integration tests
- CLI and web: 85% line and branch coverage

Coverage does not replace required behavioral cases.

## CI Matrix

Pull requests run the supported Node.js version on Linux. Before v1.0, add a
small CLI smoke matrix for Linux, macOS, and Windows. Release CI must run all
tests from a clean checkout with the frozen lockfile.

## Manual Release Checks

- Compare one result across library, CLI JSON, CLI human output, and web.
- Inspect the returned fit and next-step boundary.
- Verify assumptions, units, package version, and disclaimer are visible.
- Verify the web build makes no third-party requests.
- Verify Cloudflare headers and visible backlink destinations.
