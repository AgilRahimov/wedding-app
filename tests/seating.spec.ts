import { test, expect } from "@playwright/test";
import { db, fixtures } from "./helpers";
import { signIn } from "./helpers";

test("seat a party, then free the seat when someone declines", async ({ page }) => {
  const f = fixtures();
  // The queue hides people who have declined (you would never seat them), so
  // the party's seatable size is whoever hasn't said no — the rsvp test that
  // runs before this one has already declined for some of this party.
  const partySize = await db.guest.count({
    where: { householdId: f.householdId, rsvp: { not: "no" } },
  });
  await signIn(page);
  await page.goto("/seating");

  // pick the party in the queue, then click Table 1 on the plan
  await page.getByPlaceholder("Search a name…").fill(f.partyName);
  await page.locator("button", { hasText: f.partyName }).first().click();
  await expect(page.getByText("Now click a table to seat")).toBeVisible();
  await page.getByLabel(/^Table 1 — 0 of/).click();
  await expect(page.getByLabel(new RegExp(`^Table 1 — ${partySize} of`))).toBeVisible();

  // one of them declines (as if the reply came in later) — whoever got seated
  const seated = await db.guest.findFirstOrThrow({
    where: { tableId: { not: null } },
  });
  await db.guest.update({ where: { id: seated.id }, data: { rsvp: "no" } });
  await page.reload();
  await expect(page.getByText("still holding a seat after declining")).toBeVisible();

  // …one click reconciles
  await page.getByRole("button", { name: "Free their seats" }).click();
  await expect(page.getByText(/Freed 1 seat/)).toBeVisible();
  await expect(page.getByLabel(new RegExp(`^Table 1 — ${partySize - 1} of`))).toBeVisible();
});
