import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { collectFiles, findDuplicateExports } from "../../scripts/check/guards.mjs";

const here = dirname(fileURLToPath(import.meta.url));

describe("duplicate-exports guard (advisory)", () => {
  it("reports the same exported name across multiple files", () => {
    const files = collectFiles([resolve(here, "fixtures/violating")]);
    const duplicates = findDuplicateExports(files);
    expect(duplicates.some((d) => d.name === "normaliseCompanyName")).toBe(true);
  });

  it("does not report a unique export", () => {
    const files = collectFiles([resolve(here, "fixtures/compliant")]);
    const duplicates = findDuplicateExports(files);
    expect(duplicates.find((d) => d.name === "formatMoneyMinorUnits")).toBeUndefined();
  });
});
