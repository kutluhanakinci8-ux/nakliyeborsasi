import { test, expect } from "@playwright/test";

test.describe("Mail shell locale", () => {
  test("EN labels on login page via ?lang=en", async ({ page }) => {
    await page.goto("/login?lang=en");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText("Business webmail")).toBeVisible();
  });
});
