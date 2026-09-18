import { test, expect } from "@playwright/test";
import { db, signIn } from "./helpers";

const savedGroups = async (): Promise<string[]> => {
  const info = await db.eventInfo.findUniqueOrThrow({ where: { id: 1 } });
  return info.groupOrder ? JSON.parse(info.groupOrder) : [];
};

test("a new group is saved while empty, can hold a table, and goes only when deleted", async ({
  page,
}) => {
  const GROUP = "Bride reserve";
  await signIn(page);
  page.on("dialog", (d) => d.accept());

  // create it on the Guests screen — no invitation in it
  await page.goto("/guests");
  await page.getByRole("button", { name: "Manage groups" }).click();
  await page.getByRole("button", { name: "+ New group" }).click();
  await page.getByPlaceholder("New group name…").fill(GROUP);
  await page.getByRole("button", { name: "add", exact: true }).click();
  await expect(page.locator("li", { hasText: `${GROUP} (empty)` })).toBeVisible();
  expect(await savedGroups()).toContain(GROUP);

  // it survives a reload — it used to live only in the browser tab
  await page.reload();
  await page.getByRole("button", { name: "Manage groups" }).click();
  await expect(page.locator("li", { hasText: `${GROUP} (empty)` })).toBeVisible();

  // …and the Seating screen can already give it a table
  await page.goto("/seating");
  await page.getByPlaceholder("Search a group or a name…").fill(GROUP);
  await page.locator("button", { hasText: GROUP }).first().click();
  await page.getByLabel(/^Table 2 — 0 of/).click();
  await expect
    .poll(async () => (await db.seatTable.findFirstOrThrow({ where: { name: "Table 2" } })).groupName)
    .toBe(GROUP);

  // a group whose last invitation leaves stays too: empty a real one, then look
  const lonely = await db.household.findFirstOrThrow({ orderBy: { name: "desc" } });
  await db.household.update({ where: { id: lonely.id }, data: { group: "Only one here" } });
  await page.goto("/guests");
  await page.getByPlaceholder(/Search/).first().fill(lonely.name);
  await page.getByRole("checkbox", { name: `Select ${lonely.name}` }).first().check();
  await page.locator("select", { hasText: "Move to group…" }).selectOption(GROUP);
  await expect
    .poll(async () => (await db.household.findUniqueOrThrow({ where: { id: lonely.id } })).group)
    .toBe(GROUP);
  expect(await savedGroups()).toContain("Only one here");

  // deleting is the only way a group goes — and it frees the table
  await page.reload();
  await page.getByRole("button", { name: "Manage groups" }).click();
  await page
    .locator("li", { hasText: GROUP })
    .getByRole("button", { name: "delete" })
    .click();
  await expect.poll(savedGroups).not.toContain(GROUP);
  const table = await db.seatTable.findFirstOrThrow({ where: { name: "Table 2" } });
  expect(table.groupName).toBeNull();
});
