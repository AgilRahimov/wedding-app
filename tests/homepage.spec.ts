import { test, expect } from "@playwright/test";

test("homepage shows the couple, the date and a live countdown", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Agil & Semra" })).toBeVisible();
  await expect(page.getByText("23 October 2026 · 19:00")).toBeVisible();
  // countdown fills in after mount
  await expect(page.getByText(/^days?$/).first()).toBeVisible();
});
