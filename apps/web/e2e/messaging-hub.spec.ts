import { test, expect } from "@playwright/test";

const ACCESS_TOKEN =
  process.env.E2E_ACCESS_TOKEN ??
  process.env.MESSAGING_TEST_JWT ??
  process.env.MESSAGING_SSE_JWT ??
  "";

const BLOCKED_ACCESS_TOKEN = process.env.E2E_MESSAGING_BLOCKED_TOKEN ?? "";

const API_BASE = (
  process.env.E2E_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:8091/api/v1"
).replace(/\/$/, "");

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

    await expect(
      page.getByRole("complementary", { name: /sohbet listesi/i }),
    ).toBeVisible();
  });

  test("oturumlu: MESSAGING modülü kapalı banner", async ({ page }) => {
    test.skip(
      !BLOCKED_ACCESS_TOKEN,
      "E2E_MESSAGING_BLOCKED_TOKEN gerekli (MESSAGING entitlement olmayan hesap)",
    );

    await page.addInitScript((token) => {
      window.localStorage.setItem("nakliyeborsasi_access_token", token);
    }, BLOCKED_ACCESS_TOKEN);

    await page.goto("/messaging?tab=sohbet");
    await expect(page.locator(".messaging-module-blocked")).toBeVisible({
      timeout: 20_000,
    });
  });

  test("oturumlu: sohbetten mesaj gönder", async ({ page, request }) => {
    test.skip(!ACCESS_TOKEN, "E2E_ACCESS_TOKEN veya MESSAGING_TEST_JWT gerekli");

    const threadsResponse = await request.get(
      `${API_BASE}/messaging/threads?lang=tr`,
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
    );
    test.skip(!threadsResponse.ok(), "threads API erişilemedi");
    const threadsPayload = (await threadsResponse.json()) as {
      threads?: { threadId: string }[];
    };
    const threadId = threadsPayload.threads?.[0]?.threadId;
    test.skip(!threadId, "Açık thread yok — seed veya demo konuşma gerekli");

    await page.addInitScript((token) => {
      window.localStorage.setItem("nakliyeborsasi_access_token", token);
    }, ACCESS_TOKEN);

    const marker = `E2E_UI_${Date.now()}`;
    await page.goto(
      `/messaging?tab=sohbet&threadId=${encodeURIComponent(threadId)}`,
    );
    await expect(page.locator(".messaging-page-layout")).toBeVisible({
      timeout: 20_000,
    });

    const compose = page.getByRole("textbox", {
      name: /karşı firmaya mesaj yazın/i,
    });
    await expect(compose).toBeEnabled({ timeout: 15_000 });
    await compose.fill(marker);
    await page.getByRole("button", { name: /^Gönder$/i }).click();
    await expect(page.getByText(marker, { exact: true })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("oturumlu: görsel ek önizleme (API seed + UI)", async ({
    page,
    request,
  }) => {
    test.skip(!ACCESS_TOKEN, "E2E_ACCESS_TOKEN veya MESSAGING_TEST_JWT gerekli");

    const tinyPng =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const threadsResponse = await request.get(
      `${API_BASE}/messaging/threads?lang=tr`,
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
    );
    test.skip(!threadsResponse.ok(), "threads API erişilemedi");
    const threadId = (
      (await threadsResponse.json()) as { threads?: { threadId: string }[] }
    ).threads?.[0]?.threadId;
    test.skip(!threadId, "thread yok");

    const marker = `E2E_IMG_${Date.now()}`;
    const sendResponse = await request.post(
      `${API_BASE}/messaging/threads/${threadId}/messages?lang=tr`,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        data: {
          bodyText: marker,
          attachments: [
            {
              filename: "e2e-preview.png",
              contentType: "image/png",
              contentBase64: tinyPng,
            },
          ],
        },
      },
    );
    test.skip(!sendResponse.ok(), "ekli mesaj gönderilemedi");

    await page.addInitScript((token) => {
      window.localStorage.setItem("nakliyeborsasi_access_token", token);
    }, ACCESS_TOKEN);

    await page.goto(
      `/messaging?tab=sohbet&threadId=${encodeURIComponent(threadId)}`,
    );
    await expect(page.getByText(marker, { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator(".chat-attachment-preview img")).toBeVisible({
      timeout: 20_000,
    });
  });

  test("oturumlu: WebRTC açıklama şeridi (feature açıksa)", async ({
    page,
    request,
  }) => {
    test.skip(!ACCESS_TOKEN, "E2E_ACCESS_TOKEN veya MESSAGING_TEST_JWT gerekli");

    const statusResponse = await request.get(`${API_BASE}/messaging/status`);
    test.skip(!statusResponse.ok(), "messaging status erişilemedi");
    const status = (await statusResponse.json()) as {
      features?: string[];
    };
    test.skip(
      !(status.features ?? []).includes("browser_webrtc_disclosure"),
      "browser_webrtc_disclosure kapalı",
    );

    await page.addInitScript((token) => {
      window.localStorage.setItem("nakliyeborsasi_access_token", token);
    }, ACCESS_TOKEN);

    await page.goto("/messaging?tab=sohbet");
    await expect(
      page.locator(".messaging-chat-compliance-webrtc"),
    ).toBeVisible({ timeout: 20_000 });
  });
});
