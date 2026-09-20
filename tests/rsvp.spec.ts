import { test, expect } from "@playwright/test";
import { db, fixtures, signIn } from "./helpers";

test("a guest can RSVP through their invite link and the family sees it", async ({ page }) => {
  const f = fixtures();

  await page.goto(`/invite/${f.token}`);

  // first visit: the sealed envelope covers the page until opened or skipped
  const intro = page.getByRole("dialog", { name: "Your invitation" });
  await expect(intro.getByRole("button", { name: "Open the invitation" })).toBeVisible();
  await intro.getByRole("button", { name: "Skip" }).click();
  await expect(intro).toHaveCount(0);
  // …and it is remembered: a second visit goes straight to the page
  await page.reload();
  await expect(intro).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Watch the invitation again" })).toBeVisible();

  await expect(page.getByText(`Dear ${f.partyName}`)).toBeVisible();
  // their programme is on the page (everyone starts on Group B's timetable)
  await expect(page.getByText("Straight to Buta Palace")).toBeVisible();

  // answer for every member of the party, so no "unanswered" confirm appears
  const accepts = page.getByRole("button", { name: "Joyfully accepts" });
  for (let i = 0; i < (await accepts.count()); i++) await accepts.nth(i).click();
  await page
    .getByPlaceholder("Allergies, arrival plans, warm words…")
    .fill("Smoke-test message");
  await page.getByRole("button", { name: "Send our reply" }).click();
  await expect(page.getByText("Thank you! Your reply has been saved")).toBeVisible();

  // stamped in the database…
  const household = await db.household.findUniqueOrThrow({
    where: { id: f.householdId },
  });
  expect(household.respondedAt).not.toBeNull();
  expect(household.rsvpNote).toBe("Smoke-test message");

  // …and visible on the family's side (the List view shows the replied mark)
  await signIn(page);
  await page.goto("/guests");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByPlaceholder("Search name or phone…").fill(f.partyName);
  await expect(page.getByText("replied ✓").first()).toBeVisible();
});

test("admins can set an RSVP from the guests screen", async ({ page }) => {
  const f = fixtures();
  await signIn(page);
  await page.goto("/guests");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByPlaceholder("Search name or phone…").fill(f.partyName);
  await page.getByText(f.partyName, { exact: true }).first().click();
  // the segmented control in the edit panel
  await page.getByRole("button", { name: "no", exact: true }).first().click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  // pill reflects the change after the server round-trip
  await expect(page.locator('[title="RSVP: no"]').first()).toBeVisible();
});
