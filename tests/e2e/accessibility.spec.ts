import { test, expect } from "@playwright/test";

// Structural / ARIA checks only. This is not a full WCAG 2.2 AA audit — that
// arrives with the design-token and canonical-component work, on a consistent
// Linux execution environment.

test("foundation page exposes a sound landmark and heading structure", async ({ page }) => {
  await page.goto("/");

  // Exactly one main landmark and one level-1 heading.
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

  // Document language is declared for assistive technology.
  await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");

  // The main region is labelled by its heading.
  const region = page.getByRole("region", { name: "Development foundation" });
  await expect(region).toBeVisible();
});
