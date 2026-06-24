# Code Standards

## Runtime And Tooling

- Node.js 22 LTS
- pnpm workspaces with a committed lockfile
- TypeScript, ESM, and `strict: true`
- Vitest for tests
- Zod for public input/output validation
- ESLint and Prettier with repository-level configuration

## TypeScript Rules

- Enable `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`, and `useUnknownInCatchVariables`.
- Do not use `any`. Use `unknown`, validate, then narrow.
- Export public types and functions from explicit package entry points.
- Prefer pure functions in core.
- Keep I/O in adapters and apps.
- Represent token counts as positive safe integers.
- Include units in names such as `gpuVramGiB`, `requiredVramBytes`, and
  `contextTokens`.
- Do not use truthiness where zero is a valid value.
- Do not mutate caller-owned input or provider results.

## Public Contract Rules

- Parse all public inputs with strict schemas that reject unknown keys.
- Validate public outputs before returning them from package boundaries.
- Preserve `schemaVersion: "1"` compatibility throughout v1.
- Add fields only when old consumers remain valid; otherwise make a major
  version change.
- Error codes are stable API. Human messages may improve without changing code
  semantics.
- JSON output must be deterministic: stable field order, no timestamps, no
  environment-specific paths, and no ANSI sequences.

## Numeric Rules

- Convert GiB capacity to integer bytes exactly as specified in `bootstrap.md`.
- Compare integer required bytes with integer usable bytes; do not use a
  floating-point fit tolerance.
- Never round GiB display values back into a fit comparison.
- Never compare formatted strings.
- Align context candidates through a named helper with tested behavior.
- Reject unsafe integers and non-finite values.
- Document any engine unit conversion in the provider and test it explicitly.
- Never add unexplained "fudge factors."

## VRAM Engine Dependency Rules

- All forward estimates pass through `MathProvider`.
- Only `packages/vram-engine` implements forward formulas and owns catalogs.
- Do not duplicate model metadata, quantization tables, or formula constants
  outside the engine.
- Production code must not contain a fake/fallback provider outside tests.
- Tests may use small monotone fake providers to prove solver behavior.

## CLI Rules

- `run.ts` returns an exit code; `bin.ts` is a minimal process wrapper.
- Keep stdout clean for requested output and stderr for diagnostics.
- Never call `process.exit()` below the binary boundary.
- File and stdin input size must be bounded.
- Human output must include the estimate disclaimer.

## Web Rules

- Prefer semantic HTML and DOM text APIs.
- Meet WCAG 2.2 AA for the narrow form/result workflow.
- No `innerHTML` with user-controlled values.
- No third-party scripts, remote fonts, cookies, storage, or telemetry.
- Ensure the tool remains usable without color and at 200% zoom.

## Documentation And Comments

- Document public APIs and non-obvious numeric invariants.
- Comments explain why, not syntax.
- Update contracts and examples when behavior changes.
- Keep generated API docs optional; source docs remain authoritative.

## Dependency Policy

- Add a dependency only when it removes meaningful maintenance or security risk.
- Prefer well-maintained, narrow packages.
- Review licenses and transitive dependency impact.
- Pin GitHub Actions to commit SHAs and commit `pnpm-lock.yaml`.
