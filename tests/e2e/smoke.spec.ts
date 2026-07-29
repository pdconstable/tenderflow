import { test, expect } from "@playwright/test";

test("foundation page renders its heading and title", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Tender OS/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Development foundation" }),
  ).toBeVisible();
  await expect(page.getByText("Foundation only")).toBeVisible();
});
