import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const dataDir = resolve(root, "data");
const schemasDir = resolve(root, "schemas");
const ajvPackageRoot = dirname(fileURLToPath(import.meta.resolve("ajv/package.json")));
const draft7MetaSchemaPath = resolve(
  ajvPackageRoot,
  "dist/refs/json-schema-draft-07.json",
);

function loadJSON(filePath) {
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`ERROR loading ${filePath}: ${err.message}`);
    process.exitCode = 1;
    return null;
  }
}

function compileSchema(ajv, schemaPath) {
  try {
    const schema = loadJSON(schemaPath);
    if (!schema) return null;
    const validate = ajv.compile(schema);
    return validate;
  } catch (err) {
    console.error(`ERROR compiling schema ${schemaPath}: ${err.message}`);
    process.exitCode = 1;
    return null;
  }
}

console.log("Validating VRAM engine data files...\n");

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const draft7HttpsUri = "https://json-schema.org/draft-07/schema#";
if (!ajv.getSchema(draft7HttpsUri)) {
  const draft7MetaSchema = loadJSON(draft7MetaSchemaPath);
  if (draft7MetaSchema) {
    const cloned = JSON.parse(JSON.stringify(draft7MetaSchema));
    cloned.$id = draft7HttpsUri;
    ajv.addMetaSchema(cloned);
  }
}

const validations = [
  { data: "models.json", schema: "model.schema.json", name: "Models" },
  {
    data: "quantizations.json",
    schema: "quantization.schema.json",
    name: "Quantizations",
  },
  { data: "assumptions.json", schema: "assumptions.schema.json", name: "Assumptions" },
  { data: "provenance.json", schema: "provenance.schema.json", name: "Provenance" },
];

let allPassed = true;
for (const v of validations) {
  const dataFile = resolve(dataDir, v.data);
  const schemaFile = resolve(schemasDir, v.schema);

  if (!existsSync(dataFile)) {
    console.error(`  ${v.name}: data file not found: ${dataFile}`);
    allPassed = false;
    continue;
  }
  if (!existsSync(schemaFile)) {
    console.error(`  ${v.name}: schema file not found: ${schemaFile}`);
    allPassed = false;
    continue;
  }

  const data = loadJSON(dataFile);
  if (!data) {
    allPassed = false;
    continue;
  }

  const validate = compileSchema(ajv, schemaFile);
  if (!validate) {
    allPassed = false;
    continue;
  }

  const valid = validate(data);
  if (!valid) {
    console.error(`  ${v.name}: SCHEMA VALIDATION FAILED`);
    for (const err of validate.errors) {
      console.error(`    ${err.instancePath || "/"}: ${err.message}`);
    }
    allPassed = false;
  } else {
    const count = Array.isArray(data) ? data.length : "object";
    console.log(`  ${v.name}: validated (${count} records)`);
  }
}

if (allPassed) {
  console.log("\nAll data files validated successfully.");
} else {
  console.error("\nSome data files failed validation.");
  process.exitCode = 1;
}
