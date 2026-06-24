import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const CHECK_PATTERNS = [
  "local-llm-vram-calculator",
  "file:../../../local-llm-vram-calculator",
];

const CHECK_EXTENSIONS = new Set([".json", ".ts", ".js", ".mjs", ".yaml", ".yml"]);

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "coverage", ".changeset"]);
const SKIP_FILES = new Set(["verify-no-external-calculator.mjs"]);

let found = 0;

function checkFile(filePath) {
  const basename = filePath.split("/").pop() || filePath.split("\\").pop();
  if (SKIP_FILES.has(basename)) return;

  const parts = filePath.replace(/\\/g, "/").split("/");
  for (const part of parts) {
    if (SKIP_DIRS.has(part)) return;
  }
  const ext = parts[parts.length - 1]?.split(".").pop();
  if (!ext || !CHECK_EXTENSIONS.has("." + ext)) return;

  try {
    const content = readFileSync(filePath, "utf-8");
    for (const pattern of CHECK_PATTERNS) {
      if (content.includes(pattern)) {
        console.error(`FOUND: "${pattern}" in ${filePath.replace(root, ".")}`);
        found++;
      }
    }
  } catch {
    /* skip */
  }
}

function walk(dir) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(fullPath);
      } else if (entry.isFile()) {
        checkFile(fullPath);
      }
    }
  } catch {
    /* skip */
  }
}

console.log("Verifying no external calculator references...");
walk(root);

if (found > 0) {
  console.error(`\nFAILED: Found ${found} active reference(s).`);
  process.exit(1);
} else {
  console.log("PASSED: No active references to local-llm-vram-calculator.");
}
