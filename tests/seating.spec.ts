import { test, expect } from "@playwright/test";
import { db, fixtures } from "./helpers";
import { signIn } from "./helpers";

test("seat a guest, then free the seat when they decline", async ({ page }) => {
  const f = fixtures();
  await signIn(page);
  await page.goto("/seating");

  // choose the first person in the queue, then click Table 1 on the plan
  await page.getByPlaceholder("Search a name…").fill(f.partyName);
  await page.locator("button", { hasText: f.partyName }).first().click();
  await expect(page.getByText("Now click a table to seat")).toBeVisible();
  await page.getByTitle(/^Table 1 —/).click();
  await expect(page.getByTitle(/^Table 1 — 1 of/)).toBeVisible();

  // they decline (as if the reply came in later) — whoever actually got seated
  const seated = await db.guest.findFirstOrThrow({
    where: { tableId: { not: null } },
  });
  await db.guest.update({ where: { id: seated.id }, data: { rsvp: "no" } });
  await page.reload();
  await expect(page.getByText("still holding a seat after declining")).toBeVisible();

  // …one click reconciles
  await page.getByRole("button", { name: "Free their seats" }).click();
  await expect(page.getByText(/Freed 1 seat/)).toBeVisible();
  await expect(page.getByTitle(/^Table 1 — 0 of/)).toBeVisible();
});
