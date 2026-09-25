import { resolveApiBaseUrl } from "./apiConfig";

export type MailInboxSummary = {
  primaryAddress: string | null;
  mailboxId: string | null;
  unreadCount: number;
  totalMessages: number;
  spamCount: number;
};

export type MailInboxListItem = {
  id: string;
  fromAddress: string;
  subject: string;
  snippet: string | null;
  receivedAt: string;
  readAt: string | null;
  spamStatus: string;
};

export type MailInboxMessageDetail = MailInboxListItem & {
  bodyText: string | null;
  bodyHtml: string | null;
  emailAddress: string;
  attachments: {
    index: number;
    filename: string;
    contentType: string;
    sizeBytes: number;
  }[];
};

export type MailSentItem = {
  id: string;
  toAddress: string;
  subject: string;
  sentAt: string;
};

async function apiFetch<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${resolveApiBaseUrl()}/${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API ${path}`);
  }
  return (await response.json()) as T;
}

export async function login(
  emailAddress: string,
  password: string,
): Promise<string> {
  const response = await fetch(`${resolveApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailAddress, password }),
  });
  if (!response.ok) {
    throw new Error("Giriş başarısız");
  }
  const payload = (await response.json()) as { accessToken: string };
  return payload.accessToken;
}

export async function fetchInbox(
  accessToken: string,
  folder: "inbox" | "spam" | "all",
) {
  return apiFetch<{
    summary: MailInboxSummary;
    messages: MailInboxListItem[];
    sent: MailSentItem[];
  }>(accessToken, `company/mail-inbox?folder=${folder}`);
}

export async function fetchMessage(accessToken: string, id: string) {
  const payload = await apiFetch<{ message: MailInboxMessageDetail }>(
    accessToken,
    `company/mail-inbox/messages/${id}`,
  );
  return payload.message;
}

export async function markRead(accessToken: string, id: string) {
  await apiFetch(accessToken, `company/mail-inbox/messages/${id}/read`, {
    method: "PATCH",
  });
}

export async function composeMail(
  accessToken: string,
  body: { to: string; subject: string; text: string },
) {
  await apiFetch(accessToken, "company/mail-inbox/compose", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function replyMail(
  accessToken: string,
  messageId: string,
  text: string,
) {
  await apiFetch(accessToken, `company/mail-inbox/messages/${messageId}/reply`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
