import { test, expect } from "@playwright/test";
import {
  installMailApiMocks,
  seedMailSession,
} from "./helpers/mailApiMocks";

test.describe("Mail display settings", () => {
  test.beforeEach(async ({ page }) => {
    await installMailApiMocks(page);
    await seedMailSession(page, "en");
  });

  test("locale and timezone controls in display settings", async ({ page }) => {
    await page.goto("/mail");
    await page.getByRole("button", { name: /Ayarlar/i }).click();
    await page.getByRole("button", { name: "Ekran ve görünüm" }).click();
    await expect(page.getByText("Region & language")).toBeVisible();
    await expect(page.getByText("English")).toBeVisible();
    await expect(page.getByText("Time zone")).toBeVisible();
    const tz = page.locator("select.mail-display-select");
    await expect(tz).toHaveValue("Europe/Istanbul");
    await tz.selectOption("UTC");
    await expect(tz).toHaveValue("UTC");
  });
});
