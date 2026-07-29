// deployment-environment.ts — the single canonical source of truth for which
// deployment environment the code is running in.
//
// Returns exactly one of: "local" | "preview" | "production".
//
// Future email, billing, automation and bulk-processing code MUST depend on this
// helper rather than reading NODE_ENV directly. NODE_ENV alone is unsafe: a local
// production build sets NODE_ENV=production but is NOT the production deployment.

export type DeploymentEnvironment = "local" | "preview" | "production";

const VALID: readonly DeploymentEnvironment[] = ["local", "preview", "production"];

function isValid(value: string | undefined): value is DeploymentEnvironment {
  return value !== undefined && (VALID as readonly string[]).includes(value);
}

/**
 * Pure classifier — deterministic given an environment object. Preferred order:
 *   1. Vercel's own VERCEL_ENV signal (authoritative on Vercel).
 *   2. An explicit APP_ENV / NEXT_PUBLIC_APP_ENV override (non-Vercel hosts, tests).
 *   3. Safe fallback to "local" — including for a local production build, which
 *      is deliberately NOT treated as the production deployment.
 *
 * Malformed or missing signals fall through to "local".
 */
export function classifyDeploymentEnvironment(
  env: Record<string, string | undefined>,
): DeploymentEnvironment {
  switch (env.VERCEL_ENV) {
    case "production":
      return "production";
    case "preview":
      return "preview";
    case "development":
      return "local";
  }

  const override = env.APP_ENV ?? env.NEXT_PUBLIC_APP_ENV;
  if (isValid(override)) return override;

  // No trustworthy deployment signal. Never infer production from NODE_ENV.
  return "local";
}

let cached: DeploymentEnvironment | null = null;

/** Memoised accessor for the active process. */
export function getDeploymentEnvironment(): DeploymentEnvironment {
  if (cached === null) cached = classifyDeploymentEnvironment(process.env);
  return cached;
}

export const isProduction = (): boolean => getDeploymentEnvironment() === "production";
export const isPreview = (): boolean => getDeploymentEnvironment() === "preview";
export const isLocal = (): boolean => getDeploymentEnvironment() === "local";

/** Test-only: clear the memoised value so a fresh process.env is reclassified. */
export function resetDeploymentEnvironmentCache(): void {
  cached = null;
}
