# Roadmap

Milestones are sequential. All milestones through 9 are now complete.

## Completed Milestones

### Milestone 0 — Approve Local Ownership

The project now owns its forward VRAM engine. No external dependency is
required. This supersedes the original canonical-dependency gate.

### Milestone 1 — Capture Migration Evidence

Migration fixture structure created. Sibling checkout not available at migration time;
formulas implemented from documented contracts.

### Milestone 2 — Create packages/vram-engine

Formula modules (weights, KV-cache, overhead), catalog resolution
(model/quantization/assumptions), and `StandaloneVramProvider` implemented.
All engine outputs pass strict schemas and deterministic fixture tests.

### Milestone 3 — Add and Validate Local Datasets

Narrowed model (5 entries), quantization (9 types), assumptions, and provenance
JSON with strict JSON schemas (`additionalProperties: false`), data validation
scripts, and review-age checks.

### Milestone 4 — Repair Core Contract Compliance

Strict schemas at all public boundaries. Outputs parsed before return.
Consistency/monotonicity guards in place.

### Milestone 5 — Replace Production Imports

CLI and web switched to `StandaloneVramProvider`. `packages/canonical-adapter`
deleted. All references to `local-llm-vram-calculator` removed from source.

### Milestone 6 — Harden CLI and Web

CLI hardening: unknown flag rejection, NO_COLOR empty-value handling, dynamic
version from package.json. Web included in test workspace.

### Milestone 7 — Remove Dependency and Prove Standalone Operation

Sibling references removed from manifests, lockfile regenerated,
`scripts/verify-no-external-calculator.mjs` added. Verifier passes.

### Milestone 8 — Packaging, CI, and Release Repair

CI, build, and packaging configuration works from clean checkout.
No production-path tests are skipped.

### Milestone 9 — Final Documentation and Release Evidence

All documentation updated for standalone ownership. Removal of stale statements.
Architecture decision recorded in `docs/adr/`.

## Current Status

All 138 tests pass (0 skipped) across 14 test files. Format, lint, typecheck,
build, coverage, integration, pack check, standalone verifier, and security
audit all pass. Data validation (`validate:data`) verifies all catalog records
against JSON schemas. Pack check verifies tarball structure, declarations,
and no leaked file: references. Isolated consumer tarball installation is
verified at publish time via the release workflow.

Packages:

- `@localairigs/model-context-fit-core` — inverse solving, schemas
- `@localairigs/model-context-fit-vram-engine` — forward VRAM estimates
- `model-context-fit-checker` — CLI binary
- `@localairigs/model-context-fit-web` — static browser tool (private)

## Post-v1 Candidates

Consider only after usage evidence:

- additional output formats that preserve the v1 semantics
- embeddable static widget
- batch JSON input
- reviewed support for new runtime assumptions

Do not add GPU recommendations, a second model catalog, or performance claims.
