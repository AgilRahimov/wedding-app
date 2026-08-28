import { Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

export type Fixtures = {
  token: string;
  partyName: string;
  memberId: string;
  householdId: string;
  guestCount: number;
  partyCount: number;
};

export function fixtures(): Fixtures {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, "fixtures.json"), "utf8")
  );
}

// One client for direct checks against the TEST database — pinned to
// wedding_test so a test can never read or write the real data.
export const db = new PrismaClient({
  datasourceUrl: "postgresql://agilrahimov@localhost:5432/wedding_test",
});

export async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("agil_93@hotmail.com");
  await page.getByLabel("Password").fill("toy2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}
