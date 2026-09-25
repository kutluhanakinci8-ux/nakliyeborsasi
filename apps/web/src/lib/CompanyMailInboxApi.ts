import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type MailInboxFolder =
  | "inbox"
  | "spam"
  | "all"
  | "archive"
  | "trash";

export type MailInboxSummary = {
  primaryAddress: string | null;
  mailboxId: string | null;
  unreadCount: number;
  totalMessages: number;
  spamCount: number;
  archiveCount?: number;
  trashCount?: number;
};

export type MailInboxListItem = {
  id: string;
  fromAddress: string;
  subject: string;
  snippet: string | null;
  receivedAt: string;
  readAt: string | null;
  spamStatus: string;
  spamReason: string | null;
  attachmentCount: number;
};

export type MailInboxAttachmentMeta = {
  index: number;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export type MailInboxMessageDetail = MailInboxListItem & {
  bodyText: string | null;
  bodyHtml: string | null;
  emailAddress: string;
  attachments: MailInboxAttachmentMeta[];
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

export type MailSentItem = {
  id: string;
  toAddress: string;
  subject: string;
  sentAt: string;
  relatedInboundMessageId: string | null;
};

export type ComposeAttachment = {
  filename: string;
  contentType: string;
  contentBase64: string;
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
  const response = await fetch(
    `${PublicApiConfiguration.resolveBaseUrl()}/${path}`,
    { ...init, headers },
  );
  if (!response.ok) {
    throw new Error(`API failed: ${path}`);
  }
  return (await response.json()) as T;
}

export async function fetchCompanyMailInbox(
  accessToken: string,
  folder: MailInboxFolder = "inbox",
): Promise<{
  summary: MailInboxSummary;
  messages: MailInboxListItem[];
  sent: MailSentItem[];
  folder: string;
}> {
  return apiFetch(
    accessToken,
    `company/mail-inbox?folder=${encodeURIComponent(folder)}`,
  );
}

export async function fetchCompanyMailInboxMessage(
  accessToken: string,
  messageId: string,
): Promise<MailInboxMessageDetail> {
  const payload = await apiFetch<{ message: MailInboxMessageDetail }>(
    accessToken,
    `company/mail-inbox/messages/${messageId}`,
  );
  return payload.message;
}

export async function downloadCompanyMailAttachment(
  accessToken: string,
  messageId: string,
  index: number,
): Promise<Blob> {
  const response = await fetch(
    `${PublicApiConfiguration.resolveBaseUrl()}/company/mail-inbox/messages/${messageId}/attachments/${index}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("attachment download failed");
  }
  return response.blob();
}

export async function markCompanyMailInboxRead(
  accessToken: string,
  messageId: string,
): Promise<void> {
  await apiFetch(accessToken, `company/mail-inbox/messages/${messageId}/read`, {
    method: "PATCH",
  });
}

export async function composeCompanyMail(
  accessToken: string,
  body: {
    to: string;
    subject: string;
    text: string;
    attachments?: ComposeAttachment[];
  },
): Promise<void> {
  await apiFetch(accessToken, "company/mail-inbox/compose", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchMailImapSettings(
  accessToken: string,
): Promise<MailImapSettings> {
  const payload = await apiFetch<{ settings: MailImapSettings }>(
    accessToken,
    "company/mail-inbox/imap-settings",
  );
  return payload.settings;
}

export async function rotateMailImapPassword(accessToken: string): Promise<{
  username: string;
  password: string;
}> {
  const payload = await apiFetch<{
    credentials: { username: string; password: string };
  }>(accessToken, "company/mail-inbox/imap-credentials/rotate", {
    method: "POST",
  });
  return payload.credentials;
}

export async function replyCompanyMail(
  accessToken: string,
  messageId: string,
  body: { text: string; attachments?: ComposeAttachment[] },
): Promise<void> {
  await apiFetch(accessToken, `company/mail-inbox/messages/${messageId}/reply`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
