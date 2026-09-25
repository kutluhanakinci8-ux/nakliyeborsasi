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
  spamReason?: string | null;
  attachmentCount?: number;
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

export type MailSentMessageDetail = MailSentItem & {
  fromAddress: string;
  bodyText: string | null;
  smtpMessageId: string | null;
};

export type MailDraftItem = {
  id: string;
  to: string | null;
  subject: string | null;
  text: string | null;
  attachments: ComposeAttachment[];
  updatedAt: string;
  createdAt: string;
};

export type MailImapSettings = {
  enabled: boolean;
  imapHost: string;
  imapPort: number;
  imapTls: boolean;
  username: string | null;
  maildirPath: string | null;
  hasCredential: boolean;
};

export type ComposeAttachment = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

export function fileToAttachment(file: File): Promise<ComposeAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        contentBase64: base64,
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function formatApiError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(" ");
    }
    if (typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    /* plain text */
  }
  return raw.length > 200 ? "İşlem başarısız." : raw;
}

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
    throw new Error(formatApiError(text || `API ${path}`));
  }
  return (await response.json()) as T;
}

export async function requestPasswordReset(emailAddress: string): Promise<void> {
  const response = await fetch(
    `${resolveApiBaseUrl()}/auth/request-password-reset`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailAddress: emailAddress.trim() }),
    },
  );
  if (!response.ok) {
    throw new Error("İstek gönderilemedi");
  }
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

export type MailInboxThreadRow = {
  threadId: string;
  subject: string;
  fromAddress: string;
  snippet: string | null;
  receivedAt: string;
  messageCount: number;
  unreadCount: number;
  latestMessageId: string;
};

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

export async function fetchInboxThreads(
  accessToken: string,
  folder: "inbox" | "spam" | "all",
) {
  return apiFetch<{ threads: MailInboxThreadRow[] }>(
    accessToken,
    `company/mail-inbox/threads?folder=${folder}`,
  );
}

export async function fetchThreadMessages(
  accessToken: string,
  threadId: string,
  folder: "inbox" | "spam" | "all",
) {
  return apiFetch<{ messages: MailInboxListItem[] }>(
    accessToken,
    `company/mail-inbox/threads/${encodeURIComponent(threadId)}/messages?folder=${folder}`,
  );
}

export async function searchInbox(
  accessToken: string,
  query: string,
  folder: "inbox" | "spam" | "all",
) {
  const params = new URLSearchParams({
    q: query,
    folder,
  });
  return apiFetch<{ messages: MailInboxListItem[] }>(
    accessToken,
    `company/mail-inbox/search?${params.toString()}`,
  );
}

export async function fetchSentMessage(accessToken: string, id: string) {
  const payload = await apiFetch<{ message: MailSentMessageDetail }>(
    accessToken,
    `company/mail-inbox/sent/${id}`,
  );
  return payload.message;
}

export async function fetchMessage(accessToken: string, id: string) {
  const payload = await apiFetch<{ message: MailInboxMessageDetail }>(
    accessToken,
    `company/mail-inbox/messages/${id}`,
  );
  return payload.message;
}

export async function downloadMailAttachment(
  accessToken: string,
  messageId: string,
  index: number,
): Promise<Blob> {
  const response = await fetch(
    `${resolveApiBaseUrl()}/company/mail-inbox/messages/${messageId}/attachments/${index}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("Ek indirilemedi");
  }
  return response.blob();
}

export async function markRead(accessToken: string, id: string) {
  await apiFetch(accessToken, `company/mail-inbox/messages/${id}/read`, {
    method: "PATCH",
  });
}

export async function composeMail(
  accessToken: string,
  body: {
    to: string;
    subject: string;
    text: string;
    attachments?: ComposeAttachment[];
  },
) {
  await apiFetch(accessToken, "company/mail-inbox/compose", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function replyMail(
  accessToken: string,
  messageId: string,
  body: { text: string; attachments?: ComposeAttachment[] },
) {
  await apiFetch(
    accessToken,
    `company/mail-inbox/messages/${messageId}/reply`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function fetchDrafts(accessToken: string) {
  const payload = await apiFetch<{ drafts: MailDraftItem[] }>(
    accessToken,
    "company/mail-inbox/drafts",
  );
  return payload.drafts;
}

export async function createDraft(
  accessToken: string,
  body: {
    to?: string;
    subject?: string;
    text?: string;
    attachments?: ComposeAttachment[];
  },
) {
  const payload = await apiFetch<{ draft: MailDraftItem }>(
    accessToken,
    "company/mail-inbox/drafts",
    { method: "POST", body: JSON.stringify(body) },
  );
  return payload.draft;
}

export async function updateDraft(
  accessToken: string,
  draftId: string,
  body: {
    to?: string;
    subject?: string;
    text?: string;
    attachments?: ComposeAttachment[];
  },
) {
  const payload = await apiFetch<{ draft: MailDraftItem }>(
    accessToken,
    `company/mail-inbox/drafts/${draftId}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  return payload.draft;
}

export async function deleteDraft(accessToken: string, draftId: string) {
  await apiFetch(accessToken, `company/mail-inbox/drafts/${draftId}`, {
    method: "DELETE",
  });
}

export async function sendDraft(accessToken: string, draftId: string) {
  await apiFetch(accessToken, `company/mail-inbox/drafts/${draftId}/send`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function fetchImapSettings(accessToken: string) {
  const payload = await apiFetch<{ settings: MailImapSettings }>(
    accessToken,
    "company/mail-inbox/imap-settings",
  );
  return payload.settings;
}

export async function rotateImapPassword(accessToken: string) {
  const payload = await apiFetch<{
    credentials: { username: string; password: string };
  }>(accessToken, "company/mail-inbox/imap-credentials/rotate", {
    method: "POST",
    body: JSON.stringify({}),
  });
  return payload.credentials;
}
