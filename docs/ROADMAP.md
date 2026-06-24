# Roadmap

Milestones are sequential. An autonomous agent may proceed only when the prior
milestone's acceptance criteria pass.

## Milestone 0 - Approve Local Ownership (Complete)

The project now owns its forward VRAM engine. No external dependency is
required. This supersedes the original canonical-dependency gate.

## Milestone 1 - Capture Migration Evidence

Capture exact-forward-estimate fixtures from the documented formulas before
removing any remaining external references. Add attribution documentation.

## Milestone 2 - Create packages/vram-engine

Implement formula modules, catalog resolution, and the production
`StandaloneVramProvider`. All engine outputs pass strict schemas and
deterministic fixture tests.

## Milestone 3 - Add and Validate Local Datasets

Add narrowed model, quantization, assumptions, and provenance JSON with strict
schemas, data validation, and review-age checks.

## Milestone 4 - Repair Core Contract Compliance

Make all schemas strict, parse outputs before returning, add missing
consistency/monotonicity checks, fix cap classification, and stabilize
warning de-duplication.

## Milestone 5 - Replace Production Imports

Switch CLI and web to use `StandaloneVramProvider`. Delete
`packages/canonical-adapter`. Remove all references to
`local-llm-vram-calculator`.

## Milestone 6 - Harden CLI and Web

Fix CLI parsing, UTF-8 handling, NO_COLOR, version, and test coverage.
Improve web accessibility, validation, engine-API population, and result
display.

## Milestone 7 - Remove Dependency and Prove Standalone Operation

Remove sibling references from manifests, regenerate lockfile, and add
a verifier script that fails if the old dependency is reintroduced.

## Milestone 8 - Packaging, CI, and Release Repair

Fix integration config, coverage thresholds, pack:check, CI pipeline, and
Changesets release flow.

## Milestone 9 - Final Documentation and Release Evidence

Update all docs to match final behavior, add release checklist, and remove
stale statements.

## Post-v1 Candidates

Consider only after usage evidence:

- additional output formats that preserve the v1 semantics
- embeddable static widget
- batch JSON input
- reviewed support for new runtime assumptions

Do not add GPU recommendations, a second model catalog, or performance claims.
