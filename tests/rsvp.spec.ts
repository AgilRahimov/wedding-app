import { test, expect } from "@playwright/test";
import { db, fixtures, signIn } from "./helpers";

test("a guest can RSVP through their invite link and the family sees it", async ({ page }) => {
  const f = fixtures();

  await page.goto(`/invite/${f.token}`);
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

  // …and visible on the family's side
  await signIn(page);
  await page.goto("/guests");
  await page.getByPlaceholder("Search name or phone…").fill(f.partyName);
  await expect(page.getByText("replied ✓").first()).toBeVisible();
});

test("admins can set an RSVP from the guests screen", async ({ page }) => {
  const f = fixtures();
  await signIn(page);
  await page.goto("/guests");
  await page.getByPlaceholder("Search name or phone…").fill(f.partyName);
  await page.getByText(f.partyName, { exact: true }).first().click();
  // the segmented control in the edit panel
  await page.getByRole("button", { name: "no", exact: true }).first().click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  // pill reflects the change after the server round-trip
  await expect(page.locator('[title="RSVP: no"]').first()).toBeVisible();
});
