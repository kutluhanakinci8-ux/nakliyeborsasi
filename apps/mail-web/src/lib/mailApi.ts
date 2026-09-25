import { resolveApiBaseUrl } from "./apiConfig";

export type MailInboxFolder =
  | "inbox"
  | "spam"
  | "all"
  | "archive"
  | "trash";

export type MailMailboxFolder = "inbox" | "archive" | "trash";

export type MailStorageQuota = {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  utilizationPercent: number;
  nearLimit: boolean;
  atLimit: boolean;
  maxAttachmentBytes: number;
  limitLabelGb: number;
  windowLabelTr: string;
};

export type MailInboxSummary = {
  primaryAddress: string | null;
  mailboxId: string | null;
  unreadCount: number;
  totalMessages: number;
  spamCount: number;
  archiveCount?: number;
  trashCount?: number;
  storageQuota?: MailStorageQuota;
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
  mailboxFolder?: MailMailboxFolder;
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

export type LoginResponse =
  | { kind: "token"; accessToken: string }
  | { kind: "totp"; challengeToken: string };

export async function login(
  emailAddress: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${resolveApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailAddress, password }),
  });
  if (!response.ok) {
    throw new Error("Giriş başarısız");
  }
  const payload = (await response.json()) as {
    accessToken?: string;
    requiresTotp?: boolean;
    challengeToken?: string;
  };
  if (payload.requiresTotp && payload.challengeToken) {
    return { kind: "totp", challengeToken: payload.challengeToken };
  }
  if (!payload.accessToken) {
    throw new Error("Giriş başarısız");
  }
  return { kind: "token", accessToken: payload.accessToken };
}

export async function completeTotpLogin(
  challengeToken: string,
  code: string,
): Promise<string> {
  const response = await fetch(`${resolveApiBaseUrl()}/auth/login/totp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeToken, code }),
  });
  if (!response.ok) {
    throw new Error("Doğrulama kodu geçersiz");
  }
  const payload = (await response.json()) as { accessToken: string };
  return payload.accessToken;
}

async function mailApiFetch<T>(
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
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
}

export async function fetchTotpStatus(accessToken: string) {
  return mailApiFetch<{
    status: { enabled: boolean; enabledAt: string | null };
  }>(accessToken, "auth/totp/status");
}

export async function beginTotpSetup(accessToken: string) {
  return mailApiFetch<{
    setup: { secret: string; otpauthUrl: string };
  }>(accessToken, "auth/totp/setup", { method: "POST", body: "{}" });
}

export async function confirmTotpSetup(accessToken: string, code: string) {
  return mailApiFetch(accessToken, "auth/totp/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
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
  folder: MailInboxFolder,
) {
  return apiFetch<{
    summary: MailInboxSummary;
    messages: MailInboxListItem[];
    sent: MailSentItem[];
  }>(accessToken, `company/mail-inbox?folder=${folder}`);
}

export async function fetchInboxThreads(
  accessToken: string,
  folder: MailInboxFolder,
) {
  return apiFetch<{ threads: MailInboxThreadRow[] }>(
    accessToken,
    `company/mail-inbox/threads?folder=${folder}`,
  );
}

export async function fetchThreadMessages(
  accessToken: string,
  threadId: string,
  folder: MailInboxFolder,
) {
  return apiFetch<{ messages: MailInboxListItem[] }>(
    accessToken,
    `company/mail-inbox/threads/${encodeURIComponent(threadId)}/messages?folder=${folder}`,
  );
}

export type MailInboxSearchOptions = {
  q?: string;
  from?: string;
  receivedAfter?: string;
  receivedBefore?: string;
  hasAttachment?: boolean;
};

export async function searchInbox(
  accessToken: string,
  folder: MailInboxFolder,
  options: MailInboxSearchOptions = {},
) {
  const params = new URLSearchParams({ folder });
  const q = options.q?.trim() ?? "";
  if (q) {
    params.set("q", q);
  }
  const from = options.from?.trim() ?? "";
  if (from) {
    params.set("from", from);
  }
  if (options.receivedAfter?.trim()) {
    params.set("receivedAfter", options.receivedAfter.trim());
  }
  if (options.receivedBefore?.trim()) {
    params.set("receivedBefore", options.receivedBefore.trim());
  }
  if (options.hasAttachment === true) {
    params.set("hasAttachment", "true");
  } else if (options.hasAttachment === false) {
    params.set("hasAttachment", "false");
  }
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

export async function markUnread(accessToken: string, id: string) {
  await apiFetch(accessToken, `company/mail-inbox/messages/${id}/unread`, {
    method: "PATCH",
  });
}

export async function bulkMarkRead(accessToken: string, messageIds: string[]) {
  return apiFetch<{ updated: number }>(
    accessToken,
    "company/mail-inbox/messages/bulk/read",
    {
      method: "POST",
      body: JSON.stringify({ messageIds }),
    },
  );
}

export async function bulkMarkUnread(accessToken: string, messageIds: string[]) {
  return apiFetch<{ updated: number }>(
    accessToken,
    "company/mail-inbox/messages/bulk/unread",
    {
      method: "POST",
      body: JSON.stringify({ messageIds }),
    },
  );
}

export async function bulkSetMessageMailboxFolder(
  accessToken: string,
  messageIds: string[],
  folder: MailMailboxFolder,
) {
  return apiFetch<{ updated: number }>(
    accessToken,
    "company/mail-inbox/messages/bulk/folder",
    {
      method: "POST",
      body: JSON.stringify({ messageIds, folder }),
    },
  );
}

export async function setMessageMailboxFolder(
  accessToken: string,
  messageId: string,
  folder: MailMailboxFolder,
) {
  await apiFetch(accessToken, `company/mail-inbox/messages/${messageId}/folder`, {
    method: "PATCH",
    body: JSON.stringify({ folder }),
  });
}

export async function deleteMessagePermanently(
  accessToken: string,
  messageId: string,
) {
  await apiFetch(accessToken, `company/mail-inbox/messages/${messageId}`, {
    method: "DELETE",
  });
}

export async function composeMail(
  accessToken: string,
  body: {
    to: string;
    cc?: string;
    bcc?: string;
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
  body: {
    text: string;
    bcc?: string;
    attachments?: ComposeAttachment[];
  },
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

export async function forwardMail(
  accessToken: string,
  messageId: string,
  body: {
    to: string;
    text?: string;
    includeOriginal?: boolean;
    attachments?: ComposeAttachment[];
  },
) {
  await apiFetch(
    accessToken,
    `company/mail-inbox/messages/${messageId}/forward`,
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

export type MailComposePreset = {
  id: string;
  kind: "signature" | "template";
  name: string;
  subject: string | null;
  bodyText: string;
  isDefault: boolean;
  updatedAt: string;
};

export async function fetchComposePresets(accessToken: string) {
  return apiFetch<{
    signatures: MailComposePreset[];
    templates: MailComposePreset[];
  }>(accessToken, "company/mail-inbox/compose-presets");
}

export async function createComposePreset(
  accessToken: string,
  body: {
    kind: "signature" | "template";
    name: string;
    subject?: string;
    bodyText: string;
    isDefault?: boolean;
  },
) {
  const payload = await apiFetch<{ preset: MailComposePreset }>(
    accessToken,
    "company/mail-inbox/compose-presets",
    { method: "POST", body: JSON.stringify(body) },
  );
  return payload.preset;
}

export async function updateComposePreset(
  accessToken: string,
  presetId: string,
  body: {
    name?: string;
    subject?: string;
    bodyText?: string;
    isDefault?: boolean;
  },
) {
  const payload = await apiFetch<{ preset: MailComposePreset }>(
    accessToken,
    `company/mail-inbox/compose-presets/${presetId}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  return payload.preset;
}

export async function deleteComposePreset(
  accessToken: string,
  presetId: string,
) {
  await apiFetch(accessToken, `company/mail-inbox/compose-presets/${presetId}`, {
    method: "DELETE",
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
