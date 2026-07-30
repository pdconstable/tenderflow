// supabase-guard.test.ts — behavioural tests for scripts/lib/supabase_guard.sh.
//
// The real guard is copied into a throwaway "genuine repository" sandbox and
// sourced from there (so its own location IS the genuine repo, exactly as in a
// real run). Fixture connections live either in a SEPARATE fixture root (passed
// via $TF_GUARD_TEST_ROOT) or in $TENDERFLOW_DATABASE_URL. A fake `psql` is put
// first on PATH so that even a logic bug can never open a network connection;
// every test also asserts psql was never invoked.
//
// Dependency-free: only Node built-ins + Vitest.

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync, mkdirSync, writeFileSync, copyFileSync, readFileSync,
  rmSync, readdirSync, existsSync, chmodSync, symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const realGuard = resolve(repoRoot, "scripts/lib/supabase_guard.sh");
const realTempDir = resolve(repoRoot, "supabase/.temp");

const EXPECTED = "vrngjoorzwcgagwpzzyt";
const FORBIDDEN = "wcxxhzenwqlukhtphjyc";
const UNKNOWN = "unknownproject000000"; // synthetic, valid-format unknown ref
const WRONG = "aaaaaaaaaaaaaaaaaaaa";
const PW = "PWSENTINEL0MUSTNOTPRINT";
const POOLER_HOST = "aws-1-eu-west-2.pooler.supabase.com";

const poolerUrl = (ref: string, o: { port?: string; db?: string } = {}) =>
  `postgresql://postgres.${ref}:${PW}@${POOLER_HOST}:${o.port ?? "5432"}/${o.db ?? "postgres"}`;
const directUrl = (ref: string, o: { port?: string; db?: string; user?: string } = {}) =>
  `postgresql://${o.user ?? "postgres"}@db.${ref}.supabase.co:${o.port ?? "5432"}/${o.db ?? "postgres"}`;
const bareHostUrl = (host: string) => `postgresql://postgres@${host}:5432/postgres`;
const arbitraryHostUrl = (ref: string) =>
  `postgresql://postgres.${ref}:${PW}@evil.example.com:5432/postgres`;
const inconsistentDirectUrl = () =>
  `postgresql://postgres.${WRONG}@db.${EXPECTED}.supabase.co:5432/postgres`;
const localhostUrl = () => `postgresql://postgres@127.0.0.1:54322/postgres`;

type TestRootMode = "isolated" | "genuine" | "traversal" | "symlink" | "none";

interface Opts {
  link?: string; // connection URL placed in the fixture-root link file
  override?: string; // TENDERFLOW_DATABASE_URL
  env?: Record<string, string>;
  testMode?: boolean; // default true
  skipProbe?: boolean; // default true
  localTestMode?: boolean;
  claudeMdInFixture?: boolean; // write CLAUDE.md into the fixture root
  testRootMode?: TestRootMode; // default "isolated"
}

type Result = { code: number | null; out: string; psqlInvoked: boolean };

function writeLink(rootDir: string, content: string) {
  mkdirSync(join(rootDir, "supabase", ".temp"), { recursive: true });
  writeFileSync(join(rootDir, "supabase", ".temp", "pooler-url"), content);
}

function runGuard(opts: Opts = {}): Result {
  const mode: TestRootMode = opts.testRootMode ?? "isolated";

  // Genuine repository sandbox: the guard copy + a valid genuine link file
  // (used only when link_root resolves to the genuine root).
  const genuineRoot = mkdtempSync(join(tmpdir(), "tf-genuine-"));
  mkdirSync(join(genuineRoot, "scripts", "lib"), { recursive: true });
  copyFileSync(realGuard, join(genuineRoot, "scripts", "lib", "supabase_guard.sh"));
  writeLink(genuineRoot, poolerUrl(EXPECTED));

  // Fixture root + $TF_GUARD_TEST_ROOT value.
  let fixtureRoot: string | undefined;
  let testRootEnv: string | undefined;
  if (mode === "isolated") {
    fixtureRoot = mkdtempSync(join(tmpdir(), "tf-fixture-"));
    if (opts.link !== undefined) writeLink(fixtureRoot, opts.link);
    if (opts.claudeMdInFixture) writeFileSync(join(fixtureRoot, "CLAUDE.md"), "# fixture\n");
    testRootEnv = fixtureRoot;
  } else if (mode === "genuine") {
    testRootEnv = genuineRoot; // fake test root pointing at the genuine repo
  } else if (mode === "traversal") {
    mkdirSync(join(genuineRoot, "sub"), { recursive: true });
    testRootEnv = join(genuineRoot, "sub", ".."); // resolves back to genuine repo
  } else if (mode === "symlink") {
    fixtureRoot = mkdtempSync(join(tmpdir(), "tf-fixture-"));
    mkdirSync(join(fixtureRoot, "supabase", ".temp"), { recursive: true });
    symlinkSync(
      join(genuineRoot, "supabase", ".temp", "pooler-url"),
      join(fixtureRoot, "supabase", ".temp", "pooler-url"),
    );
    testRootEnv = fixtureRoot;
  } // "none" => no TF_GUARD_TEST_ROOT

  // Fake psql first on PATH: records invocation, never connects.
  const binDir = mkdtempSync(join(tmpdir(), "tf-bin-"));
  const sentinel = join(binDir, "psql-invoked");
  writeFileSync(join(binDir, "psql"), `#!/bin/sh\necho invoked >> "${sentinel}"\nexit 1\n`);
  chmodSync(join(binDir, "psql"), 0o755);

  const env: NodeJS.ProcessEnv = {
    NODE_ENV: process.env.NODE_ENV ?? "test",
    PATH: `${binDir}:${process.env.PATH ?? ""}`,
  };
  if (opts.skipProbe !== false) env.TF_GUARD_SKIP_LIVE_PROBE = "1";
  if (opts.testMode !== false) env.TF_GUARD_TEST_MODE = "1";
  if (opts.localTestMode) env.TF_GUARD_LOCAL_TEST_MODE = "1";
  if (testRootEnv !== undefined) env.TF_GUARD_TEST_ROOT = testRootEnv;
  if (opts.override !== undefined) env.TENDERFLOW_DATABASE_URL = opts.override;
  Object.assign(env, opts.env ?? {});

  const guardPath = join(genuineRoot, "scripts", "lib", "supabase_guard.sh");
  const res = spawnSync("bash", ["--noprofile", "--norc", "-c", `source '${guardPath}'`], {
    env,
    encoding: "utf8",
  });
  const psqlInvoked = existsSync(sentinel);

  rmSync(genuineRoot, { recursive: true, force: true });
  if (fixtureRoot) rmSync(fixtureRoot, { recursive: true, force: true });
  rmSync(binDir, { recursive: true, force: true });

  return { code: res.status, out: `${res.stdout ?? ""}${res.stderr ?? ""}`, psqlInvoked };
}

function expectNoPsql(r: Result) {
  expect(r.psqlInvoked).toBe(false);
}
function noSecretsLeaked(out: string) {
  expect(out).not.toContain(PW);
  expect(out).not.toContain(POOLER_HOST);
  expect(out).not.toContain(`postgres.${EXPECTED}:`);
}

describe("supabase_guard.sh — source policy & identity", () => {
  it("1. correct linked pooler URL passes", () => {
    const r = runGuard({ link: poolerUrl(EXPECTED) });
    expect(r.code).toBe(0);
    expect(r.out).toContain(`ref: '${EXPECTED}' matches`);
    expect(r.out).toContain("linked supabase/.temp/pooler-url");
    noSecretsLeaked(r.out); expectNoPsql(r);
  });

  it("2. wrong linked pooler URL fails (11)", () => {
    const r = runGuard({ link: poolerUrl(WRONG) });
    expect(r.code).toBe(11); expectNoPsql(r);
  });

  it("3. forbidden project fails (12)", () => {
    const r = runGuard({ link: poolerUrl(FORBIDDEN) });
    expect(r.code).toBe(12); expectNoPsql(r);
  });

  it("4. unknown third project fails (11)", () => {
    const r = runGuard({ link: poolerUrl(UNKNOWN) });
    expect(r.code).toBe(11); expect(r.out).toContain(`actual:   ${UNKNOWN}`); expectNoPsql(r);
  });

  it("5. ambient DATABASE_URL present → hard fail (14)", () => {
    const r = runGuard({ link: poolerUrl(EXPECTED), env: { DATABASE_URL: poolerUrl(UNKNOWN) } });
    expect(r.code).toBe(14); expect(r.out).toContain("$DATABASE_URL");
    expect(r.out).not.toContain(UNKNOWN); expectNoPsql(r);
  });

  it("6. ambient SUPABASE_DB_URL present → hard fail (14)", () => {
    const r = runGuard({ link: poolerUrl(EXPECTED), env: { SUPABASE_DB_URL: poolerUrl(UNKNOWN) } });
    expect(r.code).toBe(14); expectNoPsql(r);
  });

  it("7. TENDERFLOW_DATABASE_URL for the correct project passes", () => {
    const r = runGuard({ override: poolerUrl(EXPECTED) });
    expect(r.code).toBe(0); expect(r.out).toContain("TENDERFLOW_DATABASE_URL (project override)");
    noSecretsLeaked(r.out); expectNoPsql(r);
  });

  it("8. TENDERFLOW_DATABASE_URL for the wrong project fails (11)", () => {
    const r = runGuard({ override: poolerUrl(UNKNOWN) });
    expect(r.code).toBe(11); expectNoPsql(r);
  });

  it("9. correct SUPABASE_PROJECT_REF + wrong URL still fails (11)", () => {
    const r = runGuard({ link: poolerUrl(WRONG), env: { SUPABASE_PROJECT_REF: EXPECTED } });
    expect(r.code).toBe(11); expectNoPsql(r);
  });

  it("10. correct link + generic ambient var still fails (14)", () => {
    const r = runGuard({ link: poolerUrl(EXPECTED), env: { DATABASE_URL: poolerUrl(EXPECTED) } });
    expect(r.code).toBe(14); expect(r.out).not.toContain("matches expected"); expectNoPsql(r);
  });

  it("11. never prints a secret, host, or connection URL (success & failure)", () => {
    noSecretsLeaked(runGuard({ link: poolerUrl(EXPECTED) }).out);
    noSecretsLeaked(runGuard({ link: poolerUrl(UNKNOWN) }).out);
  });

  it("12. leaves the real project-link files and checksums unchanged", () => {
    const snapshot = () => {
      if (!existsSync(realTempDir)) return {};
      const m: Record<string, string> = {};
      for (const f of readdirSync(realTempDir)) {
        try { m[f] = createHash("sha256").update(readFileSync(join(realTempDir, f))).digest("hex"); } catch { /* dirs */ }
      }
      return m;
    };
    const before = snapshot();
    runGuard({ link: poolerUrl(EXPECTED) });
    runGuard({ link: poolerUrl(UNKNOWN) });
    expect(snapshot()).toEqual(before);
    expect(existsSync(realGuard)).toBe(true);
  });
});

describe("supabase_guard.sh — tightened destination/host validation (correction 1)", () => {
  it("13. exact direct host db.<expected>.supabase.co passes", () => {
    const r = runGuard({ link: directUrl(EXPECTED) });
    expect(r.code).toBe(0); expect(r.out).toContain(`ref: '${EXPECTED}' matches`); expectNoPsql(r);
  });

  it("14. bare <expected>.supabase.co (no db. prefix) fails (16)", () => {
    const r = runGuard({ link: bareHostUrl(`${EXPECTED}.supabase.co`) });
    expect(r.code).toBe(16); expectNoPsql(r);
  });

  it("15. another db.<ref>.supabase.co fails (11)", () => {
    const r = runGuard({ link: directUrl(WRONG) });
    expect(r.code).toBe(11); expectNoPsql(r);
  });

  it("16. recognised pooler + expected username passes", () => {
    const r = runGuard({ link: poolerUrl(EXPECTED) });
    expect(r.code).toBe(0); expectNoPsql(r);
  });

  it("17. recognised pooler + wrong username ref fails (11)", () => {
    const r = runGuard({ link: poolerUrl(WRONG) });
    expect(r.code).toBe(11); expectNoPsql(r);
  });

  it("18. recognised pooler on unapproved port 6543 fails (16)", () => {
    const r = runGuard({ link: poolerUrl(EXPECTED, { port: "6543" }) });
    expect(r.code).toBe(16); expect(r.out).toContain("6543"); expectNoPsql(r);
  });

  it("19. expected host with wrong database name fails (16)", () => {
    const r = runGuard({ link: poolerUrl(EXPECTED, { db: "evildb" }) });
    expect(r.code).toBe(16); expect(r.out).toContain("database name"); expectNoPsql(r);
  });

  it("20. arbitrary *.supabase.co host fails (16)", () => {
    const r = runGuard({ link: bareHostUrl("randomthing.supabase.co") });
    expect(r.code).toBe(16); expectNoPsql(r);
  });

  it("21. arbitrary non-Supabase host with expected ref in username fails (16)", () => {
    const r = runGuard({ link: arbitraryHostUrl(EXPECTED) });
    expect(r.code).toBe(16); expect(r.out).not.toContain(PW); expectNoPsql(r);
  });

  it("22. direct host with inconsistent username project ref fails (16)", () => {
    const r = runGuard({ override: inconsistentDirectUrl() });
    expect(r.code).toBe(16); expect(r.out).toContain("inconsistent"); expectNoPsql(r);
  });

  it("23. malformed URL fails (16)", () => {
    const r = runGuard({ link: "not-a-valid-url" });
    expect(r.code).toBe(16); expectNoPsql(r);
  });

  it("24. localhost rejected outside local-test mode (16)", () => {
    const r = runGuard({ override: localhostUrl() });
    expect(r.code).toBe(16); expect(r.out).toContain("localhost"); expectNoPsql(r);
  });

  it("25. localhost accepted in explicit local-test mode (0)", () => {
    const r = runGuard({ override: localhostUrl(), localTestMode: true });
    expect(r.code).toBe(0); expect(r.out).toContain("local-test"); expectNoPsql(r);
  });
});

describe("supabase_guard.sh — canonical-path probe-suppression (correction 2)", () => {
  it("26. skip WITHOUT test mode is refused (15)", () => {
    const r = runGuard({ override: poolerUrl(EXPECTED), testMode: false });
    expect(r.code).toBe(15); expect(r.out).toContain("TEST-ONLY"); expectNoPsql(r);
  });

  it("27. isolated fixture root succeeds (probe suppressed)", () => {
    const r = runGuard({ link: poolerUrl(EXPECTED), testRootMode: "isolated" });
    expect(r.code).toBe(0); expect(r.out).toContain("isolated fixture root"); expectNoPsql(r);
  });

  it("28. a fixture containing its own CLAUDE.md still works (marker is irrelevant)", () => {
    const r = runGuard({ link: poolerUrl(EXPECTED), claudeMdInFixture: true });
    expect(r.code).toBe(0); expectNoPsql(r);
  });

  it("29. a fake test root pointing at the genuine repo fails (15)", () => {
    const r = runGuard({ testRootMode: "genuine" });
    expect(r.code).toBe(15); expect(r.out).toContain("genuine repository"); expectNoPsql(r);
  });

  it("30. a symlink from a fixture to the genuine link file fails (15)", () => {
    const r = runGuard({ testRootMode: "symlink" });
    expect(r.code).toBe(15); expect(r.out).toContain("OUTSIDE the fixture root"); expectNoPsql(r);
  });

  it("31. a ../ traversal resolving to the genuine repo fails (15)", () => {
    const r = runGuard({ testRootMode: "traversal" });
    expect(r.code).toBe(15); expectNoPsql(r);
  });

  it("32. normal operational use cannot set a fake test root to suppress the probe (15)", () => {
    const r = runGuard({ testRootMode: "genuine", testMode: false });
    expect(r.code).toBe(15); expect(r.out).toContain("not an operational bypass"); expectNoPsql(r);
  });

  it("33. sourcing the guard twice cannot reuse stale state", () => {
    // First (correct) source returns 0; second (unknown project) must fail 11.
    const g1 = mkdtempSync(join(tmpdir(), "tf-genuine-"));
    const g2 = mkdtempSync(join(tmpdir(), "tf-genuine-"));
    for (const g of [g1, g2]) {
      mkdirSync(join(g, "scripts", "lib"), { recursive: true });
      copyFileSync(realGuard, join(g, "scripts", "lib", "supabase_guard.sh"));
      writeLink(g, poolerUrl(EXPECTED));
    }
    const f1 = mkdtempSync(join(tmpdir(), "tf-fixture-"));
    const f2 = mkdtempSync(join(tmpdir(), "tf-fixture-"));
    writeLink(f1, poolerUrl(EXPECTED));
    writeLink(f2, poolerUrl(UNKNOWN));
    const script =
      `TF_GUARD_TEST_ROOT='${f1}' source '${join(g1, "scripts", "lib", "supabase_guard.sh")}'\n` +
      `TF_GUARD_TEST_ROOT='${f2}' source '${join(g2, "scripts", "lib", "supabase_guard.sh")}'\n` +
      `echo REACHED_END`;
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: "test", PATH: process.env.PATH ?? "",
      TF_GUARD_TEST_MODE: "1", TF_GUARD_SKIP_LIVE_PROBE: "1",
    };
    const res = spawnSync("bash", ["--noprofile", "--norc", "-c", script], { env, encoding: "utf8" });
    for (const d of [g1, g2, f1, f2]) rmSync(d, { recursive: true, force: true });
    const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
    expect(res.status).toBe(11);
    expect(out).toContain(`actual:   ${UNKNOWN}`);
    expect(out).not.toContain("REACHED_END");
  });
});
