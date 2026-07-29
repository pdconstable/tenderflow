import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { collectFiles, findRawStatusUpdates } from "../../scripts/check/guards.mjs";

const here = dirname(fileURLToPath(import.meta.url));

describe("raw-status-update guard", () => {
  it("fails on the violating fixture", () => {
    const files = collectFiles([resolve(here, "fixtures/violating/raw-status-update.ts")]);
    const violations = findRawStatusUpdates(files);
    expect(violations.length).toBeGreaterThan(0);
  });

  it("passes on the compliant fixture", () => {
    const files = collectFiles([resolve(here, "fixtures/compliant/raw-status-update.ts")]);
    expect(findRawStatusUpdates(files)).toHaveLength(0);
  });

  it("respects the transition-module allowlist", () => {
    const target = resolve(here, "fixtures/violating/raw-status-update.ts");
    const files = collectFiles([target]);
    // Allowlisting the file's path suppresses its violations, proving the
    // extension point for approved state-machine modules works.
    expect(findRawStatusUpdates(files, [target])).toHaveLength(0);
  });
});
