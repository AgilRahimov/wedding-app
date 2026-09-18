import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { db, signIn } from "./helpers";

// The floor plan — adding, moving, rotating, deleting tables — is the owner's
// alone. The rest of the family decides who sits where, nothing more.

test("a family editor sees no floor-plan tools", async ({ page }) => {
  await db.adminUser.upsert({
    where: { email: "editor@test.local" },
    update: {},
    create: {
      email: "editor@test.local",
      name: "Test Editor",
      role: "editor",
      passwordHash: await bcrypt.hash("editor-pass-1", 10),
    },
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill("editor@test.local");
  await page.getByLabel("Password").fill("editor-pass-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/seating");
  await expect(page.getByRole("heading", { name: "Groups to place" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Move tables" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "+ Add table" })).toHaveCount(0);

  // a half-round's popup: seating tools yes, rotate/delete no
  await page.getByLabel(/^Table 1 — /).click();
  await expect(page.getByRole("dialog", { name: "Table 1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add a seat" })).toBeVisible();
  await expect(page.getByText("Table layout options")).toHaveCount(0);
});

test("the owner has them", async ({ page }) => {
  await signIn(page);
  await page.goto("/seating");
  await expect(page.getByRole("button", { name: "Move tables" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Add table" })).toBeVisible();
  await page.getByLabel(/^Table 1 — /).click();
  await expect(page.getByText("Table layout options")).toBeVisible();
});
