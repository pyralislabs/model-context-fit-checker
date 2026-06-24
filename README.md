# model-context-fit-checker

Answer the inverse local-LLM memory question:

> Given a fixed GPU VRAM budget and model configuration, what is the largest
> usable context window?

## Quick Start

```bash
pnpm install
pnpm build

# CLI
node apps/cli/dist/bin.js --model llama-3.1-8b --quant q4_k_m --vram-gib 12

# With JSON output
node apps/cli/dist/bin.js --model llama-3.1-8b --quant q4_k_m --vram-gib 12 --json

# Development server for web tool
pnpm --filter @localairigs/model-context-fit-web dev
```

## CLI Usage

```text
model-context-fit --model <id> --quant <id> --vram-gib <number> [options]
model-context-fit --input request.json [--json]
cat request.json | model-context-fit --stdin --json
model-context-fit --help
model-context-fit --version
```

| Option               | Description                                   |
| -------------------- | --------------------------------------------- |
| `--model`            | Model identifier (e.g., `llama-3.1-8b`)       |
| `--quant`            | Quantization (e.g., `q4_k_m`, `q8_0`, `fp16`) |
| `--vram-gib`         | GPU VRAM in GiB (e.g., `12`, `24`)            |
| `--headroom-percent` | Additional headroom (0–50, default 10)        |
| `--min-context`      | Minimum context tokens (default 1)            |
| `--max-context`      | Maximum context tokens (optional cap)         |
| `--granularity`      | Context alignment (default 1)                 |
| `--runtime-profile`  | Runtime profile (e.g., `balanced`)            |
| `--kv-cache-dtype`   | KV cache dtype (e.g., `fp16`)                 |
| `--json`             | Machine-readable JSON output                  |
| `--pretty`           | Pretty-print JSON (requires `--json`)         |

Exit codes: `0` success, `2` invalid input, `3` provider failure, `1` error.

## Project Status

> **Current: Standalone VRAM engine migration complete.**

The project owns its forward VRAM engine (`packages/vram-engine`).
No external VRAM calculator dependency is required or supported.

## Architecture

```text
CLI --------\
              -> core solver -> MathProvider -> packages/vram-engine
Static web -/
Library ----/
```

- **`packages/core`** — inverse solving, schemas, validation, binary search
- **`packages/vram-engine`** — forward VRAM estimates, model/quantization catalogs
- **`apps/cli`** — Node.js CLI
- **`apps/web`** — static browser tool (Vite)

## Documentation

Documentation is in `docs/` and the project root:

| Document                       | Purpose                       |
| ------------------------------ | ----------------------------- |
| `bootstrap.md`                 | Implementation contract       |
| `docs/ARCHITECTURE.md`         | Component boundaries          |
| `docs/VRAM_ENGINE_CONTRACT.md` | VRAM engine contract          |
| `docs/CODE_STANDARDS.md`       | TypeScript/code standards     |
| `docs/ROADMAP.md`              | Milestones                    |
| `docs/TESTING.md`              | Testing strategy              |
| `docs/VRAM_ASSUMPTIONS.md`     | VRAM assumptions              |
| `docs/DATASET_PROVENANCE.md`   | Dataset provenance            |
| `AGENTS.md`                    | Agent instructions            |
| `docs/adr/`                    | Architecture decision records |

## Backlinks And Attribution

The static page may contain visible links to:

- [Local AI Rigs](https://localairigs.com)
- [Pyralis Labs](https://pyralislabs.io)

These links are not injected into library results, CLI output, or JSON.

## License

MIT — See [LICENSE](LICENSE).
