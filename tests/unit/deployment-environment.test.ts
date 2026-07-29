import { describe, it, expect } from "vitest";
import { classifyDeploymentEnvironment } from "@/lib/deployment-environment";

describe("classifyDeploymentEnvironment", () => {
  it("maps VERCEL_ENV=production to production", () => {
    expect(classifyDeploymentEnvironment({ VERCEL_ENV: "production" })).toBe("production");
  });

  it("maps VERCEL_ENV=preview to preview", () => {
    expect(classifyDeploymentEnvironment({ VERCEL_ENV: "preview" })).toBe("preview");
  });

  it("maps VERCEL_ENV=development to local", () => {
    expect(classifyDeploymentEnvironment({ VERCEL_ENV: "development" })).toBe("local");
  });

  it("honours an explicit APP_ENV override on non-Vercel hosts", () => {
    expect(classifyDeploymentEnvironment({ APP_ENV: "production" })).toBe("production");
    expect(classifyDeploymentEnvironment({ APP_ENV: "preview" })).toBe("preview");
    expect(classifyDeploymentEnvironment({ NEXT_PUBLIC_APP_ENV: "local" })).toBe("local");
  });

  it("never infers production from a local production build (NODE_ENV alone)", () => {
    expect(classifyDeploymentEnvironment({ NODE_ENV: "production" })).toBe("local");
  });

  it("falls back to local for missing or malformed signals", () => {
    expect(classifyDeploymentEnvironment({})).toBe("local");
    expect(classifyDeploymentEnvironment({ VERCEL_ENV: "nonsense" })).toBe("local");
    expect(classifyDeploymentEnvironment({ APP_ENV: "staging" })).toBe("local");
  });

  it("prefers the Vercel signal over an APP_ENV override", () => {
    expect(
      classifyDeploymentEnvironment({ VERCEL_ENV: "production", APP_ENV: "local" }),
    ).toBe("production");
  });
});
