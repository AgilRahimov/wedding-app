import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
import { fixtures, signIn } from "./helpers";

test("Excel export contains one row per guest", async ({ page }) => {
  const f = fixtures();
  await signIn(page);

  const response = await page.request.get("/guests/export");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("spreadsheetml");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await response.body()) as unknown as ArrayBuffer);
  const ws = wb.getWorksheet("Guests")!;
  expect(ws.rowCount).toBe(f.guestCount + 1); // + header row
});
