import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type MailInboxSummary = {
  primaryAddress: string | null;
  mailboxId: string | null;
  unreadCount: number;
  totalMessages: number;
};

export type MailInboxListItem = {
  id: string;
  fromAddress: string;
  subject: string;
  snippet: string | null;
  receivedAt: string;
  readAt: string | null;
};

export type MailInboxMessageDetail = MailInboxListItem & {
  bodyText: string | null;
  emailAddress: string;
};

async function apiFetch<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(
    `${PublicApiConfiguration.resolveBaseUrl()}/${path}`,
    { ...init, headers },
  );
  if (!response.ok) {
    throw new Error(`API failed: ${path}`);
  }
  return (await response.json()) as T;
}

export async function fetchCompanyMailInbox(accessToken: string): Promise<{
  summary: MailInboxSummary;
  messages: MailInboxListItem[];
}> {
  return apiFetch(accessToken, "company/mail-inbox");
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

export async function markCompanyMailInboxRead(
  accessToken: string,
  messageId: string,
): Promise<void> {
  await apiFetch(accessToken, `company/mail-inbox/messages/${messageId}/read`, {
    method: "PATCH",
  });
}
