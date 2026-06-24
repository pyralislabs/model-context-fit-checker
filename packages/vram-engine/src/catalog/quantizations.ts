import quantizationsRaw from "../generated/quantizations.js";
import type { QuantizationRecord, PublicQuantizationSummary } from "../contracts.js";
import { unknownQuantization } from "../errors.js";

const quantizations = quantizationsRaw as QuantizationRecord[];

const index = new Map<string, QuantizationRecord>();

for (const q of quantizations) {
  index.set(q.id, q);
}

export function resolveQuantization(id: string): QuantizationRecord {
  const record = index.get(id);
  if (!record) throw unknownQuantization(id);
  return { ...record };
}

export function listQuantizations(): readonly PublicQuantizationSummary[] {
  return quantizations.map((q) => ({
    id: q.id,
    displayName: q.displayName,
    effectiveBitsPerWeight: q.effectiveBitsPerWeight,
    status: q.status,
  }));
}
