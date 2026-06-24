# Changelog

## 0.1.0 (Unreleased)

- **Standalone VRAM engine migration:** Removed external `local-llm-vram-calculator` dependency
- New `packages/vram-engine` with formula implementations (weights, KV-cache, overhead)
- Model/quantization/provenance catalogs with strict JSON schemas
- `StandaloneVramProvider` replaces `LocalLlmVramProvider`
- `packages/canonical-adapter` deleted
- CLI hardening: NO_COLOR empty-value handling, dynamic version, unknown flag rejection
- Documentation rewritten for standalone ownership (AGENTS.md, bootstrap.md, ARCHITECTURE.md, etc.)
- All 138 tests pass with zero skips across 14 test files
- Data validation validates all catalog records against JSON schemas using ajv
- Pack smoke test verifies tarball structure, declarations, and no leaked file: references
- Per-package coverage thresholds configured for core (80/70/70/80), engine (80/60/60/80), CLI (50/40/30/50), web (60/40/40/60)
- Web selects populated from engine list APIs instead of free-text inputs
- Solver: full-cache monotonicity guard, enhanced consistency checks, boundary warning probes
- CLI: fatal UTF-8 decoding, file size pre-check, missing option value rejection

## 0.0.1 (Unreleased)

- Initial project bootstrap and workspace setup
- Core schemas, validation, and solver implementation
- CLI binary with JSON and human output modes
- Static web tool with full accessibility
- CI workflows and packaging configuration
