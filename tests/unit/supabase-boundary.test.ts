import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Verifies the browser client boundary without contacting any live service:
//   - given valid PUBLIC config, it constructs a client exposing the expected
//     shape (no network call is made at construction time)
//   - given missing config, the env boundary throws a clear error
//
// vi.resetModules() gives each case a fresh module graph so the memoised env
// cache does not leak between tests. process.env is global, so we snapshot and
// restore the two keys we touch.

const KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
let snapshot: Record<string, string | undefined>;

beforeEach(() => {
  snapshot = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  vi.resetModules();
});

afterEach(() => {
  for (const k of KEYS) {
    if (snapshot[k] === undefined) delete process.env[k];
    else process.env[k] = snapshot[k];
  }
});

describe("createSupabaseBrowserClient", () => {
  it("constructs a client from valid public configuration", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example-ref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key-value";

    const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser");
    const client = createSupabaseBrowserClient();

    expect(client).toBeTruthy();
    expect(typeof client.from).toBe("function");
    expect(client.auth).toBeTruthy();
  });

  it("throws a clear error when public configuration is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser");
    expect(() => createSupabaseBrowserClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
