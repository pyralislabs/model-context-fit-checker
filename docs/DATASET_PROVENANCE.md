# Dataset Provenance

## Ownership

Model, quantization, and assumption data is owned by this repository.
Sources are documented in `packages/vram-engine/data/provenance.json`.

## Review Cadence

Records should be reviewed within 180 days of their last `reviewedAt` date.
Stale records are rejected by the data validation script
(`pnpm --filter @localairigs/model-context-fit-vram-engine validate:data`),
which runs in CI and during release workflows.

## Update Procedure

1. Update the relevant JSON file in `packages/vram-engine/data/`.
2. Update `reviewedAt` to the current date.
3. Update `provenance.json` if adding a new source.
4. Update `version` fields in `provenance.json` (dataset version) or
   `assumptions.json` (assumption version) for semantic changes.
5. Run `pnpm validate:data` to verify.
6. Run full test suite.

## Versioning

- Dataset version (`provenance.json`): changes when catalog entries are added,
  removed, or modified.
- Assumption version (`assumptions.json`): changes when formula or runtime
  profile values change.
- Package version (`package.json`): SemVer for API and implementation releases.
- Fixture version: changes when expected-result format changes.

## Sources

See `packages/vram-engine/data/provenance.json` for the complete list of data
sources, including publisher, URL, access date, license, and usage notes.
