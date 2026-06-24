import modelsRaw from "../generated/models.js";
import type { ModelRecord, PublicModelSummary } from "../contracts.js";
import { unknownModel } from "../errors.js";

const models = modelsRaw as ModelRecord[];

const idIndex = new Map<string, ModelRecord>();
const aliasIndex = new Map<string, ModelRecord>();

for (const model of models) {
  idIndex.set(model.id, model);
  aliasIndex.set(model.id.toLowerCase(), model);
  for (const alias of model.aliases) {
    const lower = alias.toLowerCase().trim();
    if (!aliasIndex.has(lower)) {
      aliasIndex.set(lower, model);
    }
  }
}

function getModelRecord(idOrAlias: string): ModelRecord {
  const byId = idIndex.get(idOrAlias);
  if (byId) return byId;
  const lower = idOrAlias.toLowerCase().trim();
  const byAlias = aliasIndex.get(lower);
  if (byAlias) return byAlias;
  throw unknownModel(idOrAlias);
}

export function resolveModel(idOrAlias: string): ModelRecord {
  const record = getModelRecord(idOrAlias);
  return { ...record };
}

export function listModels(): readonly PublicModelSummary[] {
  return models.map((m) => ({
    id: m.id,
    displayName: m.displayName,
    family: m.family,
    parameterCount: m.parameterCount,
    declaredMaxContextTokens: m.declaredMaxContextTokens,
  }));
}
