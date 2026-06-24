# AGENTS.md - model-context-fit-checker

Read this file before changing this project.

## Mission

Build a deterministic TypeScript CLI, library, and static web tool that answers:

> Given a fixed GPU VRAM budget and model configuration, what is the largest
> usable context window?

This project owns the complete forward VRAM estimate, inverse solving,
user-facing contracts, and presentation. It does not claim measured hardware
performance and does not provide hardware recommendations.

## Ownership Boundary

`model-context-fit-checker` owns the narrow forward VRAM estimate required to
solve the context-fit problem. It owns the reviewed model and quantization
catalogs, runtime/KV assumptions, formulas, versions, and provenance used by
that estimate. It does not claim measured hardware behavior and does not
provide hardware recommendations.

- `packages/vram-engine` owns the forward VRAM estimate calculation, catalog
  data, assumptions, and the production `MathProvider` implementation.
- `packages/core` owns inverse solving, request/result schemas, validation,
  and provider guards. It does not import catalog data or formula modules.
- `packages/canonical-adapter` is removed. All forward estimation goes through
  `packages/vram-engine`.
- All calculations are deterministic and offline.
- No backend, telemetry, storage, or runtime network dependency.
- No GPU recommendations, prices, affiliate output, or performance claims.
- Every result remains an estimate and exposes assumptions and versions.

## Working Rules

- No backend, database, analytics SDK, telemetry, browser storage, or runtime
  network dependency.
- Keep calculations deterministic and offline.
- Treat all results as estimates. Always expose assumptions and package
  versions.
- Validate at every public boundary. Never silently clamp invalid input.
- Keep stdout machine-readable when `--json` is used; diagnostics go to stderr.
- Preserve JSON compatibility within a major version.
- Use integer context-token values and explicit context granularity.
- Do not claim benchmarked or measured hardware performance.
- Do not add GPU purchase recommendations or affiliate links to generated CLI
  or JSON output.
- Visible web-page backlinks are permitted only as documented in `README.md`.

## Required Reading

- `bootstrap.md`
- `docs/VRAM_ENGINE_CONTRACT.md`
- `docs/ARCHITECTURE.md`
- `docs/CODE_STANDARDS.md`
- `docs/TESTING.md`
- `docs/ROADMAP.md`

## Implementation Sequence

Follow the milestones in `docs/ROADMAP.md`. Product implementation may proceed
independently of any external package publication.

## Validation

```bash
pnpm format:check           # passes
pnpm lint                   # passes (0 issues)
pnpm typecheck              # passes
pnpm test                   # all 138 pass (14 test files)
pnpm test:coverage          # passes (thresholds enforced per-package)
pnpm test:integration       # passes (138 tests including integration)
pnpm build                  # all 4 workspaces build
pnpm --filter @localairigs/model-context-fit-vram-engine validate:data  # passes
pnpm pack:check             # tarball verification passes
pnpm verify:standalone      # no external calculator references
pnpm audit --prod --audit-level high  # no vulnerabilities
```

## Definition Of Done

Work is done only when the relevant acceptance criteria in `bootstrap.md` and
`docs/ROADMAP.md` pass, public behavior is documented, tests cover boundaries
and failures, and no external VRAM calculator dependency remains.
