#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const publicPackages = [
  { name: "@localairigs/model-context-fit-core", dir: "packages/core" },
  { name: "@localairigs/model-context-fit-vram-engine", dir: "packages/vram-engine" },
  { name: "model-context-fit-checker", dir: "apps/cli" },
];

function tarballContents(tarballPath) {
  const out = execSync(`tar -tzf "${tarballPath}"`, { encoding: "utf-8" });
  return out.split("\n").filter(Boolean);
}

function findTarballPath(pkgDir) {
  const out = execSync(`ls "${pkgDir}"/*.tgz 2>/dev/null || true`, {
    encoding: "utf-8",
  }).trim();
  const files = out
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);
  return files.length > 0 ? resolve(pkgDir, files[0]) : null;
}

let allPassed = true;

console.log("--- Packing and verifying all packages ---\n");

for (const pkg of publicPackages) {
  const pkgDir = resolve(root, pkg.dir);
  const pkgJson = JSON.parse(readFileSync(resolve(pkgDir, "package.json"), "utf-8"));

  console.log(`--- ${pkg.name} ---`);

  try {
    execSync(`rm -f "${pkgDir}"/*.tgz`, { shell: true });
    execSync("pnpm pack", { cwd: pkgDir, stdio: "pipe" });

    const actualTarball = findTarballPath(pkgDir);
    if (!actualTarball) {
      throw new Error("Tarball not found");
    }

    const sizeKB = (readFileSync(actualTarball).length / 1024).toFixed(0);
    console.log(`  Tarball: ${actualTarball.split("/").pop()} (${sizeKB} KB)`);

    const files = tarballContents(actualTarball);
    console.log(`  Files: ${files.length}`);

    if (!files.some((f) => f.endsWith("package.json"))) {
      throw new Error("No package.json in tarball");
    }

    const leakedPaths = files
      .filter((f) => !f.startsWith("package/") && f !== "package/")
      .filter((f) => f.includes("../../") || f.startsWith("/"));
    if (leakedPaths.length > 0) {
      throw new Error(`Tarball contains leaked paths: ${leakedPaths.join(", ")}`);
    }

    const hasDeclarations = files.some((f) => f.endsWith(".d.ts"));
    if (!hasDeclarations) {
      throw new Error("No .d.ts files in tarball");
    }

    if (pkg.name === "model-context-fit-checker") {
      if (!files.some((f) => f.endsWith("dist/bin.js"))) {
        throw new Error("dist/bin.js not in tarball");
      }
    }

    const expectedFiles = ["LICENSE", "package.json"];
    if (pkg.name !== "model-context-fit-checker") {
      expectedFiles.push("THIRD_PARTY_NOTICES.md");
    }
    for (const expected of expectedFiles) {
      if (!files.some((f) => f.endsWith(expected))) {
        throw new Error(`${expected} not in tarball`);
      }
    }

    // Verify no file: references in packed package.json
    const tarOut = execSync(`tar -xzf "${actualTarball}" -O package/package.json`, {
      encoding: "utf-8",
    });
    const packedPkg = JSON.parse(tarOut);
    const allDeps = { ...packedPkg.dependencies, ...packedPkg.devDependencies };
    for (const [depName, depVersion] of Object.entries(allDeps)) {
      if (typeof depVersion === "string" && depVersion.startsWith("file:")) {
        throw new Error(
          `file: reference in packed package.json: ${depName}@${depVersion}`,
        );
      }
    }
    console.log(`  No file: references in packed package.json`);

    console.log(`  PASS: ${pkg.name} v${pkgJson.version}`);
  } catch (err) {
    console.error(`  FAIL: ${err.message}`);
    allPassed = false;
  } finally {
    execSync(`rm -f "${pkgDir}"/*.tgz`, { shell: true });
  }
}

console.log(
  allPassed ? "\nAll packages passed smoke test." : "\nSome packages FAILED smoke test.",
);
process.exit(allPassed ? 0 : 1);
