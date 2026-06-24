# VRAM Assumptions

## Formula Versions

- Weights: `weights-v1` — `ceil(parameters * bits_per_weight / 8)`
- KV Cache: `kv-cache-v1` — multiplicative layers, heads, dim, 2 (K+V), element bytes, sequences
- Overhead: `overhead-v1` — runtime fixed + compute buffer + safety margin

## Runtime Profiles

Values are defined in `packages/vram-engine/data/assumptions.json`:

| Profile        | Fixed GiB | Min Compute GiB | Weight Buffer | Min Safety GiB | Safety Fraction |
| -------------- | --------- | --------------- | ------------- | -------------- | --------------- |
| `lean`         | 0.25      | 0.25            | 0.03          | 0.25           | 0.05            |
| `balanced`     | 0.50      | 0.50            | 0.05          | 0.50           | 0.10            |
| `conservative` | 1.00      | 1.00            | 0.08          | 1.00           | 0.15            |

## KV Cache Dtypes

| Dtype  | Bytes/Element | Status    |
| ------ | ------------- | --------- |
| `fp16` | 2             | Supported |
| `bf16` | 2             | Supported |
| `fp32` | 4             | Supported |
| `q8_0` | 1             | Idealized |
| `q4_0` | 0.5           | Idealized |

Idealized dtypes emit warnings. Their byte estimates assume perfect compression
without overhead; actual implementations may differ.

## Fixed Assumptions

- Parallel sequence count: 1 (no batch inference)
- KV cache includes key + value (multiplier of 2)
- Headroom percent is applied outside the engine estimate
- All values are estimates, not runtime guarantees

## Limitations

- No multi-GPU topology, pooling, or offload optimization
- No training or fine-tuning memory
- No CPU offloading or system RAM estimates
- No throughput, latency, or power estimates

## Version

Assumption version is defined in `data/assumptions.json`. Every estimate
includes the current version.
