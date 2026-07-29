// guards.mjs — dependency-free static safety guards for Tender OS application code.
//
// These enforce a subset of the mandatory automated guards in
// docs/engineering/testing-and-release.md. They are intentionally simple,
// text-based checks with no runtime dependencies. Each guard is exported as a
// pure function so it can be unit-tested against isolated fixtures, and driven
// over real source by run.mjs.
//
// Scope note: guards run over application source only (src/). Tooling under
// scripts/ and deliberately-violating fixtures under tests/ are never scanned
// by run.mjs, so pattern literals in this file do not self-trigger.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, sep } from "node:path";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);

const ALWAYS_SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
  "playwright-report",
  "test-results",
]);

/**
 * Recursively collect source files from a list of file or directory targets.
 * @param {string[]} targets
 * @returns {string[]} absolute-or-relative file paths
 */
export function collectFiles(targets) {
  const files = [];
  const visit = (target) => {
    let st;
    try {
      st = statSync(target);
    } catch {
      // Target does not exist; nothing to scan. Explicitly ignored — a missing
      // optional scan target is not a guard failure.
      return;
    }
    if (st.isDirectory()) {
      const base = target.split(sep).pop();
      if (base && ALWAYS_SKIP_DIRS.has(base)) return;
      for (const entry of readdirSync(target)) {
        visit(join(target, entry));
      }
    } else if (st.isFile() && SOURCE_EXTENSIONS.has(extname(target))) {
      files.push(target);
    }
  };
  for (const t of targets) visit(t);
  return files;
}

/** Read a file as UTF-8, returning "" if unreadable. */
function read(file) {
  return readFileSync(file, "utf8");
}

// ---------------------------------------------------------------------------
// Guard 1 — Empty / swallowed catches
// ---------------------------------------------------------------------------
//
// Fails on:
//   - inline promise catch with an empty arrow body: .catch(() => {})
//   - a catch block whose body is empty or contains only comments/whitespace
//
// Escape hatch: a catch body annotated with a `safe-catch:` comment explaining
// why swallowing is deliberate is permitted (rare, must be justified).

const SAFE_CATCH_ANNOTATION = /safe-catch:/;

function stripComments(body) {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .trim();
}

/**
 * @param {string[]} files
 * @returns {{file: string, line: number, snippet: string}[]}
 */
export function findSwallowedCatches(files) {
  const violations = [];
  for (const file of files) {
    const src = read(file);

    // (a) Inline .catch() with an empty function body.
    const inline = /\.catch\(\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)?\s*=>\s*\{\s*\}\s*\)/g;
    let m;
    while ((m = inline.exec(src)) !== null) {
      const line = src.slice(0, m.index).split("\n").length;
      violations.push({ file, line, snippet: m[0].trim() });
    }
    // Also .catch(function () {}) empty body.
    const inlineFn = /\.catch\(\s*(?:async\s*)?function\s*[A-Za-z_$]*\s*\([^)]*\)\s*\{\s*\}\s*\)/g;
    while ((m = inlineFn.exec(src)) !== null) {
      const line = src.slice(0, m.index).split("\n").length;
      violations.push({ file, line, snippet: m[0].trim() });
    }

    // (b) catch (...) { ... } blocks with an empty/comment-only body.
    const catchKeyword = /\bcatch\b\s*(?:\([^)]*\))?\s*\{/g;
    while ((m = catchKeyword.exec(src)) !== null) {
      const braceStart = catchKeyword.lastIndex - 1; // index of the '{'
      const body = extractBraceBody(src, braceStart);
      if (body === null) continue;
      const stripped = stripComments(body.text);
      if (stripped.length === 0 && !SAFE_CATCH_ANNOTATION.test(body.text)) {
        const line = src.slice(0, m.index).split("\n").length;
        violations.push({ file, line, snippet: "empty catch block" });
      }
    }
  }
  return violations;
}

/** Given the index of an opening '{', return the body text between braces. */
function extractBraceBody(src, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return { text: src.slice(openIndex + 1, i) };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Guard 2 — Raw status mutation outside approved transition modules
// ---------------------------------------------------------------------------
//
// No domain entities exist yet, so the allowlist of approved transition modules
// is empty. The guard is structured so that, later, controlled status fields and
// the modules permitted to transition them can be added.
//
// Detects representative prohibited patterns:
//   - .update({ ... status: ... })   (repository-style status write)
//   - status = "<literal>"           (direct status assignment to a literal)

/** Approved transition modules may mutate status directly. Empty for now. */
export const APPROVED_STATUS_TRANSITION_MODULES = [];

function isAllowlistedStatusModule(file, allowlist) {
  return allowlist.some((allowed) => file.includes(allowed));
}

/**
 * @param {string[]} files
 * @param {string[]} [allowlist]
 * @returns {{file: string, line: number, snippet: string}[]}
 */
export function findRawStatusUpdates(files, allowlist = APPROVED_STATUS_TRANSITION_MODULES) {
  const violations = [];
  const updateWithStatus = /\.update\(\s*\{[^}]*\bstatus\b\s*:/g;
  const directAssign = /\bstatus\s*=\s*["'`]/g;

  for (const file of files) {
    if (isAllowlistedStatusModule(file, allowlist)) continue;
    const src = read(file);
    for (const rx of [updateWithStatus, directAssign]) {
      rx.lastIndex = 0;
      let m;
      while ((m = rx.exec(src)) !== null) {
        const line = src.slice(0, m.index).split("\n").length;
        violations.push({ file, line, snippet: m[0].trim() });
      }
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Guard 3 — Duplicate exported function names (advisory)
// ---------------------------------------------------------------------------
//
// Reports the same exported function name defined in more than one file, which
// commonly indicates copy-paste of domain logic. Advisory only: it returns
// findings; run.mjs prints them without failing the build.

const DUPLICATE_EXPORT_ALLOWLIST = new Set([
  // Next.js route/handler and framework conventions that legitimately recur.
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "middleware",
  "generateMetadata",
  "generateStaticParams",
  "default",
]);

/**
 * @param {string[]} files
 * @returns {{name: string, files: string[]}[]}
 */
export function findDuplicateExports(files) {
  const byName = new Map();
  const patterns = [
    /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
    /export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g,
  ];
  for (const file of files) {
    const src = read(file);
    for (const rx of patterns) {
      rx.lastIndex = 0;
      let m;
      while ((m = rx.exec(src)) !== null) {
        const name = m[1];
        if (DUPLICATE_EXPORT_ALLOWLIST.has(name)) continue;
        if (!byName.has(name)) byName.set(name, new Set());
        byName.get(name).add(file);
      }
    }
  }
  const duplicates = [];
  for (const [name, fileSet] of byName) {
    if (fileSet.size > 1) duplicates.push({ name, files: [...fileSet] });
  }
  return duplicates;
}
