import { describe, it, expect } from "vitest";
import { loadPublicEnv, loadServerEnv, publicEnvSchema } from "@/lib/env";

const validPublic = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example-ref.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key-value",
};

describe("loadPublicEnv", () => {
  it("returns typed values for a valid source", () => {
    const env = loadPublicEnv(validPublic);
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(validPublic.NEXT_PUBLIC_SUPABASE_URL);
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe(validPublic.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  });

  it("fails fast when a required variable is absent", () => {
    expect(() =>
      loadPublicEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://example-ref.supabase.co" }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("fails fast when a required variable has the wrong format", () => {
    expect(() =>
      loadPublicEnv({ ...validPublic, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" }),
    ).toThrow(/must be a valid URL/);
  });

  it("labels the failure with the active deployment environment", () => {
    expect(() => loadPublicEnv({ VERCEL_ENV: "preview" })).toThrow(/for "preview"/);
  });
});

describe("loadServerEnv", () => {
  it("declares no required server variables in this batch", () => {
    expect(loadServerEnv({})).toEqual({});
  });
});

describe("publicEnvSchema", () => {
  it("only exposes NEXT_PUBLIC_-prefixed keys", () => {
    for (const key of Object.keys(publicEnvSchema.shape)) {
      expect(key.startsWith("NEXT_PUBLIC_")).toBe(true);
    }
  });
});
