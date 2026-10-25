import { test, expect } from "@playwright/test";
import {
  installMailApiMocks,
  seedMailSession,
} from "./helpers/mailApiMocks";

test.describe("Mail compose overlay", () => {
  test.beforeEach(async ({ page }) => {
    await installMailApiMocks(page);
    await seedMailSession(page, "en");
  });

  test("opens compose from sidebar button", async ({ page }) => {
    await page.goto("/mail");
    await expect(page.getByRole("button", { name: "Compose" })).toBeVisible();
    await page.getByRole("button", { name: "Compose" }).click();
    await expect(
      page.getByRole("heading", { name: "New message" }),
    ).toBeVisible();
    await expect(page.locator("#compose-to")).toBeVisible();
  });
});
