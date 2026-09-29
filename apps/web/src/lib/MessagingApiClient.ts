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
  threadKind?: "pair" | "group";
  title?: string | null;
  participantCompanyIds?: string[] | null;
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
  readByCounterpartyUserIds?: string[];
  readByCounterpartyReaders?: { userId: string; displayName: string }[];
  messageKind?: "public" | "internal";
  editedAt?: string | null;
  deleted?: boolean;
  mentionUserIds?: string[];
  attachments?: ThreadMessageAttachmentRecord[];
};

export type MessagingThreadSummaryRecord = {
  headline: string;
  bullets: string[];
  messageCount: number;
  generatedAt: string;
  source: "structured";
};

export type MessagingListingCardRecord = {
  listingId: string;
  routeLabel: string;
  equipmentTypeCode: string;
  weightTonnes: string;
  loadingDateStart: string;
  priceAmount: string | null;
  priceCurrencyCode: string | null;
  marketScopeCode: string;
};

export type MessagingOfferTimelineEntryRecord = {
  at: string;
  kind: string;
  label: string;
  amountText?: string;
};

export type MessagingThreadInsightsRecord = {
  summary: MessagingThreadSummaryRecord;
  listingCard: MessagingListingCardRecord | null;
  offerTimeline: MessagingOfferTimelineEntryRecord[];
  llmSummary: { text: string; provider: string } | null;
};

export type MessagingSearchResultRecord = {
  kind: "message";
  threadId: string;
  messageId: string;
  snippet: string;
  counterpartyCompanyId: string;
  counterpartyLegalName: string | null;
  createdAt: string;
};

export type MessagingCompanySearchRecord = {
  companyId: string;
  legalName: string;
  countryCode: string;
  participantTypeCode: string | null;
  trustScoreValue: number;
  trustReviewCount: number;
  hasExistingThread: boolean;
};

export type MessagingQuickReplyRecord = {
  id: string;
  labelTr: string;
  bodyText: string;
  scope: "system" | "organization";
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

  public static async openGroupThread(
    accessToken: string,
    locale: string,
    participantCompanyIds: string[],
    options?: { title?: string; freightListingId?: string },
  ): Promise<{ thread: { id: string } }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads/group?lang=${locale}`,
      {
        method: "POST",
        body: JSON.stringify({
          participantCompanyIds,
          ...(options?.title ? { title: options.title } : {}),
          ...(options?.freightListingId
            ? { freightListingId: options.freightListingId }
            : {}),
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

  public static async fetchThreadInsights(
    accessToken: string,
    locale: string,
    threadId: string,
    includeLlm = false,
  ): Promise<MessagingThreadInsightsRecord> {
    const llm = includeLlm ? "&llm=1" : "";
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads/${threadId}/summary?lang=${locale}${llm}`,
    ) as Promise<MessagingThreadInsightsRecord>;
  }

  public static async searchMessages(
    accessToken: string,
    locale: string,
    query: string,
  ): Promise<{ query: string; results: MessagingSearchResultRecord[] }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/search?lang=${locale}&q=${encodeURIComponent(query)}`,
    ) as Promise<{ query: string; results: MessagingSearchResultRecord[] }>;
  }

  public static async searchCompanies(
    accessToken: string,
    locale: string,
    query: string,
  ): Promise<{ query: string; companies: MessagingCompanySearchRecord[] }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/companies/search?lang=${locale}&q=${encodeURIComponent(query)}`,
    ) as Promise<{ query: string; companies: MessagingCompanySearchRecord[] }>;
  }

  public static async fetchMessagingHubDefault(
    accessToken: string,
    locale: string,
  ): Promise<{ defaultTab: "email" | "chat" }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/hub-default?lang=${locale}`,
    ) as Promise<{ defaultTab: "email" | "chat" }>;
  }

  public static async fetchQuickReplies(
    accessToken: string,
    locale: string,
  ): Promise<{ templates: MessagingQuickReplyRecord[] }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/quick-replies?lang=${locale}`,
    ) as Promise<{ templates: MessagingQuickReplyRecord[] }>;
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
    messageKind?: "public" | "internal",
  ): Promise<void> {
    await AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads/${threadId}/messages?lang=${locale}`,
      {
        method: "POST",
        body: JSON.stringify({
          bodyText,
          ...(attachments?.length ? { attachments } : {}),
          ...(messageKind === "internal" ? { messageKind: "internal" } : {}),
        }),
      },
    );
  }

  public static async sendTyping(
    accessToken: string,
    locale: string,
    threadId: string,
  ): Promise<void> {
    await AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads/${threadId}/typing?lang=${locale}`,
      { method: "POST" },
    );
  }

  public static async updateMessage(
    accessToken: string,
    locale: string,
    threadId: string,
    messageId: string,
    bodyText: string,
  ): Promise<void> {
    await AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads/${threadId}/messages/${messageId}?lang=${locale}`,
      { method: "PATCH", body: JSON.stringify({ bodyText }) },
    );
  }

  public static async deleteMessage(
    accessToken: string,
    locale: string,
    threadId: string,
    messageId: string,
  ): Promise<void> {
    await AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads/${threadId}/messages/${messageId}?lang=${locale}`,
      { method: "DELETE" },
    );
  }

  public static async acceptFixedPriceFromThread(
    accessToken: string,
    locale: string,
    threadId: string,
  ): Promise<{ sessionId: string; bidId: string; systemMessageId: string }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/threads/${threadId}/actions/accept-fixed-price?lang=${locale}`,
      { method: "POST" },
    ) as Promise<{ sessionId: string; bidId: string; systemMessageId: string }>;
  }

  public static async fetchColleagues(
    accessToken: string,
    locale: string,
  ): Promise<{
    colleagues: {
      userId: string;
      displayName: string;
      mentionToken: string;
    }[];
  }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/messaging/colleagues?lang=${locale}`,
    ) as Promise<{
      colleagues: {
        userId: string;
        displayName: string;
        mentionToken: string;
      }[];
    }>;
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
