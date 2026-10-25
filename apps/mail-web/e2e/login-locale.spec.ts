import { expect, test } from "@playwright/test";

test.describe("Lerta Posta login", () => {
  test("TR login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Giriş" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "E-posta" })).toBeVisible();
  });

  test("EN login via locale toggle", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "English" }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("EN login via ?lang=en", async ({ page }) => {
    await page.goto("/login?lang=en");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});
