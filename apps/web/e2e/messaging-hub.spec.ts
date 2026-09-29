import { test, expect } from "@playwright/test";

const ACCESS_TOKEN =
  process.env.E2E_ACCESS_TOKEN ??
  process.env.MESSAGING_TEST_JWT ??
  process.env.MESSAGING_SSE_JWT ??
  "";

test.describe("Mesajlar hub", () => {
  test("login sayfası messaging next ile açılır", async ({ page }) => {
    await page.goto("/login?next=%2Fmessaging%3Ftab%3Dsohbet");
    await expect(page.getByRole("tab", { name: /giriş/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /giriş yap/i })).toBeVisible();
  });

  test("messaging korumalı — oturum yoksa login yönlendirmesi", async ({
    page,
  }) => {
    await page.goto("/messaging?tab=sohbet");
    await page.waitForURL(/\/login/, { timeout: 15_000 });
    expect(page.url()).toMatch(/login/);
  });

  test("oturumlu: şerit Posta/Sohbet ve layout", async ({ page }) => {
    test.skip(!ACCESS_TOKEN, "E2E_ACCESS_TOKEN veya MESSAGING_TEST_JWT gerekli");

    await page.addInitScript((token) => {
      window.localStorage.setItem("nakliyeborsasi_access_token", token);
    }, ACCESS_TOKEN);

    await page.goto("/messaging?tab=sohbet");
    await expect(page.locator(".messaging-page-layout")).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByRole("button", { name: /posta/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sohbet/i }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: /posta/i }).first().click();
    await expect(page).toHaveURL(/tab=email|tab=posta|tab=mail/);

    await page.getByRole("button", { name: /sohbet/i }).first().click();
    await expect(page).toHaveURL(/tab=chat|tab=sohbet/);
  });
});
