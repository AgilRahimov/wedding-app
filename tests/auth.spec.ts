import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test("wrong password is rejected with a generic error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("agil_93@hotmail.com");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Wrong email or password.")).toBeVisible();
});

test("right password lands on the dashboard", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("signed-out visitors are sent to the login screen", async ({ page }) => {
  await page.goto("/guests");
  await page.waitForURL("**/login");
});

test("a bad invite token is a 404", async ({ page }) => {
  const response = await page.goto("/invite/not-a-real-token");
  expect(response!.status()).toBe(404);
});
