import type { Page, Route } from "@playwright/test";
import type { MailInboxListItem, MailInboxPreferences } from "../../src/lib/mailApi";
import { DEFAULT_MAIL_POSTA_PREFERENCES } from "../../src/lib/mailPostaPrefs";

export const E2E_MAIL_TOKEN = "e2e-mail-access-token";

export function mockInboxPreferences(
  overrides: Partial<MailInboxPreferences> = {},
): MailInboxPreferences {
  return {
    dailyDigestEnabled: false,
    autoReplyEnabled: false,
    autoReplyBodyText: null,
    autoReplyActiveFrom: null,
    autoReplyActiveUntil: null,
    inboxListDensity: "comfortable",
    mailAppLockEnabled: false,
    ...DEFAULT_MAIL_POSTA_PREFERENCES,
    ...overrides,
  };
}

const DEFAULT_MESSAGES: MailInboxListItem[] = [
  {
    id: "msg-1",
    fromAddress: "alice@example.com",
    subject: "First message",
    snippet: "Hello from Alice",
    receivedAt: "2026-10-20T09:00:00.000Z",
    readAt: "2026-10-20T09:05:00.000Z",
    spamStatus: "clean",
  },
  {
    id: "msg-2",
    fromAddress: "bob@example.com",
    subject: "Second message",
    snippet: "Hello from Bob",
    receivedAt: "2026-10-21T10:00:00.000Z",
    readAt: null,
    spamStatus: "clean",
  },
];

function messageDetail(id: string) {
  const row = DEFAULT_MESSAGES.find((m) => m.id === id) ?? DEFAULT_MESSAGES[0];
  return {
    ...row,
    bodyText: row.snippet ?? "Body",
    bodyHtml: `<p>${row.snippet ?? "Body"}</p>`,
    emailAddress: "user@lerta.test",
    attachments: [],
  };
}

type MockOptions = {
  messages?: MailInboxListItem[];
};

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function installMailApiMocks(
  page: Page,
  options: MockOptions = {},
) {
  const messages = options.messages ?? DEFAULT_MESSAGES;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api\/v1\//, "");
    const method = request.method();

    if (path === "company/mail-inbox" && method === "GET") {
      await fulfillJson(route, {
        summary: {
          primaryAddress: "user@lerta.test",
          mailboxId: "mb-1",
          unreadCount: 1,
          totalMessages: messages.length,
          spamCount: 0,
        },
        sendReadiness: {
          canSend: true,
          reasonTr: null,
          displayAddress: "user@lerta.test",
        },
        messages,
        sent: [],
        connectedAccounts: [],
      });
      return;
    }

    if (path === "company/mail-inbox/preferences" && method === "GET") {
      await fulfillJson(route, { preferences: mockInboxPreferences() });
      return;
    }

    if (path === "company/mail-inbox/drafts" && method === "GET") {
      await fulfillJson(route, { drafts: [] });
      return;
    }

    if (path === "company/mail-inbox/branding" && method === "GET") {
      await fulfillJson(route, { branding: null });
      return;
    }

    if (path === "company/mail-inbox/custom-folders" && method === "GET") {
      await fulfillJson(route, { folders: [] });
      return;
    }

    if (path === "auth/webauthn/credentials" && method === "GET") {
      await fulfillJson(route, { credentials: [], hasPasskeys: false });
      return;
    }

    const messageMatch = path.match(
      /^company\/mail-inbox\/messages\/([^/]+)$/,
    );
    if (messageMatch && method === "GET") {
      await fulfillJson(route, { message: messageDetail(messageMatch[1]) });
      return;
    }

    const readMatch = path.match(
      /^company\/mail-inbox\/messages\/([^/]+)\/read$/,
    );
    if (readMatch && method === "POST") {
      await fulfillJson(route, { ok: true });
      return;
    }

    if (
      path === "company/mail-inbox/inbox/refresh-ai-focus" &&
      method === "POST"
    ) {
      await fulfillJson(route, { ok: true, updated: 0, skipped: 0 });
      return;
    }

    await route.continue();
  });
}

export async function seedMailSession(
  page: Page,
  locale: "tr" | "en" = "en",
) {
  await page.addInitScript(
    ({ token, uiLocale }) => {
      localStorage.setItem("lerta_mail_access_token", token);
      localStorage.setItem("lerta-mail-ui-locale", uiLocale);
    },
    { token: E2E_MAIL_TOKEN, uiLocale: locale },
  );
}
