import { test, expect } from "@playwright/test";
import { db, fixtures } from "./helpers";
import { signIn } from "./helpers";

test("seat a group at its table, then free the table", async ({ page }) => {
  const f = fixtures();
  // 1 group = 1 table, so seating works on the fixture party's whole group.
  // The seat count is who has not declined — the rsvp test that runs before
  // this one has already declined for some of this party.
  const household = await db.household.findUniqueOrThrow({
    where: { id: f.householdId },
  });
  const coming = await db.guest.count({
    where: { household: { group: household.group }, rsvp: { not: "no" } },
  });

  await signIn(page);
  // The fixture group can be bigger than the table — accept the "seat them
  // anyway?" confirmation instead of letting Playwright dismiss it.
  page.on("dialog", (d) => d.accept());
  await page.goto("/seating");

  // pick the group in the queue, then click Table 1 on the plan
  await page.getByPlaceholder("Search a group or a name…").fill(f.partyName);
  await page.locator("button", { hasText: household.group }).first().click();
  await expect(page.getByText("Now click a table to seat")).toBeVisible();
  await page.getByLabel(/^Table 1 — 0 of/).click();
  await expect(page.getByLabel(new RegExp(`^Table 1 — ${coming} of`))).toBeVisible();
  const linked = await db.seatTable.findFirstOrThrow({ where: { name: "Table 1" } });
  expect(linked.groupName).toBe(household.group);

  // a decline frees its seat by itself — no reconciliation step any more
  const seatedGuest = await db.guest.findFirstOrThrow({
    where: { household: { group: household.group }, rsvp: { not: "no" } },
  });
  await db.guest.update({ where: { id: seatedGuest.id }, data: { rsvp: "no" } });
  await page.reload();
  await expect(page.getByLabel(new RegExp(`^Table 1 — ${coming - 1} of`))).toBeVisible();

  // freeing the table makes the group unplaced again
  await page.getByLabel(new RegExp(`^Table 1 — ${coming - 1} of`)).click();
  await page.getByRole("button", { name: "Free this table" }).click();
  await expect(page.getByLabel(/^Table 1 — 0 of/)).toBeVisible();
  const freed = await db.seatTable.findFirstOrThrow({ where: { name: "Table 1" } });
  expect(freed.groupName).toBeNull();
});
