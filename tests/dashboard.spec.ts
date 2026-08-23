import { test, expect } from "@playwright/test";
import { fixtures, signIn } from "./helpers";

test("dashboard totals match the database", async ({ page }) => {
  const f = fixtures();
  await signIn(page);
  await expect(
    page.getByText(`${f.partyCount} invited parties · ${f.guestCount} people`)
  ).toBeVisible();
});
