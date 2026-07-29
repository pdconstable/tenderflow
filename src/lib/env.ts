// env.ts — the single canonical, validated environment schema for Tender OS.
//
// Principles (docs/engineering/reliability-and-state.md — Environment validation):
//   - one canonical schema; fail fast when a required variable is absent/invalid
//   - classify variables as public (browser-safe, NEXT_PUBLIC_) vs server-only
//   - never expose server-only values to the client bundle
//   - typed access; do not read arbitrary process.env values across the app
//
// SCOPE FOR THIS BATCH: only variables genuinely required by the implemented
// foundation are validated. The foundation needs the public Supabase connection
// values for its client boundaries. Stripe, Resend, AI Gateway, Companies House
// and service-role secrets are intentionally NOT declared until those
// integrations exist — declaring them required now would fail-fast for no reason.

import { z } from "zod";
import { classifyDeploymentEnvironment } from "@/lib/deployment-environment";

// ---------------------------------------------------------------------------
// Public environment — safe to expose to the browser. Must be NEXT_PUBLIC_*.
// ---------------------------------------------------------------------------
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL (e.g. https://<ref>.supabase.co)"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY (publishable/anon key) is required"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

// ---------------------------------------------------------------------------
// Server-only environment — never sent to the browser.
// No server-only variables are required by the current foundation. This schema
// exists as the extension point for future server secrets (each added with an
// explicit format and a manual-setup disclosure — see architecture-and-platform.md).
// ---------------------------------------------------------------------------
export const serverEnvSchema = z.object({});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
}

/**
 * Validate the public environment from an explicit source (defaults to
 * process.env). Throws a clear, environment-labelled error on failure — this is
 * the fail-fast behaviour: no silent disabling of features.
 */
export function loadPublicEnv(
  source: Record<string, string | undefined> = process.env,
): PublicEnv {
  const environment = classifyDeploymentEnvironment(source);
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `[env] Invalid public environment configuration for "${environment}":\n${formatIssues(result.error)}`,
    );
  }
  return result.data;
}

/**
 * Validate the server-only environment from an explicit source. Currently
 * always succeeds (no required server variables), but routes all future
 * server-secret access through one validated boundary.
 */
export function loadServerEnv(
  source: Record<string, string | undefined> = process.env,
): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`[env] Invalid server environment configuration:\n${formatIssues(result.error)}`);
  }
  return result.data;
}

let cachedPublicEnv: PublicEnv | null = null;

/** Memoised, validated public environment for the running process. */
export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv === null) cachedPublicEnv = loadPublicEnv();
  return cachedPublicEnv;
}

/** Test-only: clear the memoised public env. */
export function resetPublicEnvCache(): void {
  cachedPublicEnv = null;
}
