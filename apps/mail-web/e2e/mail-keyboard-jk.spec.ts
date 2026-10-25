import { test, expect } from "@playwright/test";
import {
  installMailApiMocks,
  seedMailSession,
} from "./helpers/mailApiMocks";

test.describe("Mail keyboard list navigation", () => {
  test.beforeEach(async ({ page }) => {
    await installMailApiMocks(page);
    await seedMailSession(page, "en");
  });

  test("j moves selection to next inbox row", async ({ page }) => {
    await page.goto("/mail");
    // Smart sort lists newest first (Second message, then First message).
    await page.getByText("Second message").click();
    await expect(page.locator(".mail-inbox-row.selected")).toContainText(
      "Second message",
    );
    await page.keyboard.press("j");
    await expect(page.locator(".mail-inbox-row.selected")).toContainText(
      "First message",
    );
    await page.keyboard.press("k");
    await expect(page.locator(".mail-inbox-row.selected")).toContainText(
      "Second message",
    );
  });

  test("shortcuts dialog documents j/k in English", async ({ page }) => {
    await page.goto("/mail");
    await page.keyboard.press("?");
    await expect(
      page.getByRole("heading", { name: "Keyboard shortcuts" }),
    ).toBeVisible();
    await expect(page.getByText("Next / previous message (list)")).toBeVisible();
  });
});
