#!/usr/bin/env node
// run.mjs — CLI runner for the static safety guards.
//
// Scans APPLICATION SOURCE ONLY (src/). Tooling under scripts/ and the
// deliberately-violating fixtures under tests/ are never scanned here.
//
// Exit code 0 = clean; 1 = at least one BLOCKING guard failed.
// Duplicate-exports is advisory and never changes the exit code.

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  collectFiles,
  findSwallowedCatches,
  findRawStatusUpdates,
  findDuplicateExports,
} from "./guards.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const scanTargets = [resolve(repoRoot, "src")];
const files = collectFiles(scanTargets);

let blockingFailures = 0;

function reportBlocking(title, violations) {
  if (violations.length === 0) {
    console.log(`✅  ${title}: clean (${files.length} files scanned)`);
    return;
  }
  blockingFailures += violations.length;
  console.error(`❌  ${title}: ${violations.length} violation(s)`);
  for (const v of violations) {
    console.error(`    ${v.file}:${v.line}  ${v.snippet}`);
  }
}

reportBlocking("swallowed-catch", findSwallowedCatches(files));
reportBlocking("raw-status-update", findRawStatusUpdates(files));

// Advisory guard — reports, never blocks.
const duplicates = findDuplicateExports(files);
if (duplicates.length === 0) {
  console.log("✅  duplicate-exports: none (advisory)");
} else {
  console.warn(`⚠️   duplicate-exports (advisory): ${duplicates.length} name(s) defined in multiple files`);
  for (const d of duplicates) {
    console.warn(`    ${d.name} -> ${d.files.join(", ")}`);
  }
}

if (blockingFailures > 0) {
  console.error(`\nGuard check FAILED with ${blockingFailures} blocking violation(s).`);
  process.exit(1);
}
console.log("\nAll blocking guards passed.");
