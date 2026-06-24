import assumptionsRaw from "../generated/assumptions.js";
import type { RuntimeProfileValues, KvCacheDtypeInfo } from "../contracts.js";
import { unknownRuntimeProfile, unknownKvCacheDtype } from "../errors.js";

const catalog = assumptionsRaw as {
  version: string;
  assumptionLines: string[];
  runtimeProfiles: Record<string, RuntimeProfileValues>;
  kvCacheDtypes: Record<string, KvCacheDtypeInfo>;
  parallelSequences: number;
};

export function getAssumptionVersion(): string {
  return catalog.version;
}

export function getAssumptionLines(): readonly string[] {
  return catalog.assumptionLines;
}

export function resolveRuntimeProfile(id: string): RuntimeProfileValues {
  const profile = catalog.runtimeProfiles[id];
  if (!profile) throw unknownRuntimeProfile(id);
  return { ...profile };
}

export function resolveKvCacheDtype(id: string): KvCacheDtypeInfo {
  const dtype = catalog.kvCacheDtypes[id];
  if (!dtype) throw unknownKvCacheDtype(id);
  return { ...dtype };
}

export function getParallelSequences(): number {
  return catalog.parallelSequences;
}

export function listRuntimeProfiles(): Array<{ id: string; fixedGiB: number }> {
  return Object.entries(catalog.runtimeProfiles).map(([id, vals]) => ({
    id,
    fixedGiB: vals.fixedGiB,
  }));
}

export function listKvCacheDtypes(): Array<{ id: string; bytesPerElement: number }> {
  return Object.entries(catalog.kvCacheDtypes).map(([id, info]) => ({
    id,
    bytesPerElement: info.bytesPerElement,
  }));
}
