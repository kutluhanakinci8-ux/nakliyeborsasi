import { AuthenticatedApiClient } from "./AuthenticatedApiClient";
import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type MessagingThreadRecord = {
  threadId: string;
  counterpartyCompanyId: string;
  counterpartyLegalName?: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  freightListingId?: string | null;
  unreadCount?: number;
  threadKind?: "b2b" | "org_channel";
  channelSlug?: string | null;
  channelName?: string | null;
};

export type ThreadMessageAttachmentRecord = {
  index: number;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export type ThreadMessageRecord = {
  id: string;
  senderCompanyId: string;
  bodyText: string;
  createdAt: string;
  readByRecipient?: boolean;
  attachments?: ThreadMessageAttachmentRecord[];
  senderKind?: "user" | "bot";
  senderLabel?: string | null;
};

export type MessagingSearchHit = {
  threadId: string;
  messageId: string;
  threadKind: "b2b" | "org_channel";
  channelSlug: string | null;
  channelName: string | null;
  counterpartyLegalName: string | null;
  bodySnippet: string;
  createdAt: string;
};

export type MessagingThreadSummaryRecord = {
  headline: string;
  bullets: string[];
  messageCount: number;
  generatedAt: string;
  source: "structured";
};

export class MessagingApiClient {
  public static async createStreamTicket(
    accessToken: string,
    locale: string,
  ): Promise<{ ticket: string; expiresInSeconds: number }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/stream/ticket?lang=${locale}`,
      { method: "POST" },
    ) as Promise<{ ticket: string; expiresInSeconds: number }>;
  }

  public static streamUrl(ticket: string): string {
    const base = PublicApiConfiguration.resolveBaseUrl();
    return `${base}/messaging/stream?ticket=${encodeURIComponent(ticket)}`;
  }

  public static async listThreads(
    accessToken: string,
    locale: string,
  ): Promise<{ threads: MessagingThreadRecord[] }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads?lang=${locale}`,
    ) as Promise<{ threads: MessagingThreadRecord[] }>;
  }

  public static async openThread(
    accessToken: string,
    locale: string,
    counterpartyCompanyId: string,
    freightListingId?: string,
  ): Promise<{ thread: { id: string } }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads?lang=${locale}`,
      {
        method: "POST",
        body: JSON.stringify({
          counterpartyCompanyId,
          ...(freightListingId ? { freightListingId } : {}),
        }),
      },
    ) as Promise<{ thread: { id: string } }>;
  }

  public static async listMessages(
    accessToken: string,
    locale: string,
    threadId: string,
  ): Promise<{ messages: ThreadMessageRecord[] }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads/${threadId}/messages?lang=${locale}`,
    ) as Promise<{ messages: ThreadMessageRecord[] }>;
  }

  public static async fetchThreadSummary(
    accessToken: string,
    locale: string,
    threadId: string,
  ): Promise<{ summary: MessagingThreadSummaryRecord }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads/${threadId}/summary?lang=${locale}`,
    ) as Promise<{ summary: MessagingThreadSummaryRecord }>;
  }

  public static async translateMessage(
    accessToken: string,
    locale: string,
    text: string,
    targetLocale: string,
  ): Promise<{ translatedText: string; provider: string }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/translate?lang=${locale}`,
      {
        method: "POST",
        body: JSON.stringify({ text, targetLocale }),
      },
    ) as Promise<{ translatedText: string; provider: string }>;
  }

  public static async enterpriseSearch(
    accessToken: string,
    locale: string,
    query: string,
  ): Promise<{ hits: MessagingSearchHit[]; query: string }> {
    const q = encodeURIComponent(query);
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/search?q=${q}&lang=${locale}`,
    ) as Promise<{ hits: MessagingSearchHit[]; query: string }>;
  }

  public static async rotateBotToken(
    accessToken: string,
  ): Promise<{ config: { botDisplayName: string; webhookToken: string } }> {
    return AuthenticatedApiClient.fetchJson(accessToken, `/messaging/bot/rotate-token`, {
      method: "POST",
    }) as Promise<{ config: { botDisplayName: string; webhookToken: string } }>;
  }

  public static async exportArchive(
    accessToken: string,
    locale: string,
  ): Promise<{ export: unknown }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/export?lang=${locale}`,
    ) as Promise<{ export: unknown }>;
  }

  public static async sendMessage(
    accessToken: string,
    locale: string,
    threadId: string,
    bodyText: string,
    attachments?: {
      filename: string;
      contentType: string;
      contentBase64: string;
    }[],
  ): Promise<void> {
    await AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads/${threadId}/messages?lang=${locale}`,
      {
        method: "POST",
        body: JSON.stringify({
          bodyText,
          ...(attachments?.length ? { attachments } : {}),
        }),
      },
    );
  }

  public static attachmentDownloadUrl(
    locale: string,
    threadId: string,
    messageId: string,
    index: number,
  ): string {
    const base = PublicApiConfiguration.resolveBaseUrl();
    return `${base}/messaging/threads/${threadId}/messages/${messageId}/attachments/${index}?lang=${encodeURIComponent(locale)}`;
  }

  public static async downloadAttachment(
    accessToken: string,
    locale: string,
    threadId: string,
    messageId: string,
    index: number,
  ): Promise<Blob> {
    const url = MessagingApiClient.attachmentDownloadUrl(
      locale,
      threadId,
      messageId,
      index,
    );
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error("Ek indirilemedi");
    }
    return response.blob();
  }
}
