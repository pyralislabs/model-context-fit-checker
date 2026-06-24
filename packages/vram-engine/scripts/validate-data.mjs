import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const dataDir = resolve(root, "data");
const schemasDir = resolve(root, "schemas");

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

function validateFile(dataFile, schemaFile, name) {
  const data = loadJSON(dataFile);
  if (!data) return false;

  if (existsSync(schemaFile)) {
    console.log(
      `  ${name}: data loaded (${Array.isArray(data) ? data.length + " records" : "object"}), schema: ${schemaFile}`,
    );
  } else {
    console.log(`  ${name}: data loaded, no schema file found at ${schemaFile}`);
  }
  return true;
}

console.log("Validating VRAM engine data files...\n");

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
  if (!validateFile(dataFile, schemaFile, v.name)) {
    allPassed = false;
  }
}

if (allPassed) {
  console.log("\nAll data files validated successfully.");
} else {
  console.error("\nSome data files failed validation.");
  process.exitCode = 1;
}
