import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { collectFiles, findSwallowedCatches } from "../../scripts/check/guards.mjs";

const here = dirname(fileURLToPath(import.meta.url));

describe("swallowed-catch guard", () => {
  it("fails on the violating fixture", () => {
    const files = collectFiles([resolve(here, "fixtures/violating/swallowed-catch.ts")]);
    const violations = findSwallowedCatches(files);
    expect(violations.length).toBeGreaterThan(0);
  });

  it("passes on the compliant fixture", () => {
    const files = collectFiles([resolve(here, "fixtures/compliant/swallowed-catch.ts")]);
    expect(findSwallowedCatches(files)).toHaveLength(0);
  });
});
