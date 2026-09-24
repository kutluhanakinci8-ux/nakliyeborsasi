import { PublicApiConfiguration } from "./PublicApiConfiguration";

async function adminFetch<T>(
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
    `${PublicApiConfiguration.resolveBaseUrl()}/platform-admin/${path}`,
    { ...init, headers },
  );
  if (!response.ok) {
    throw new Error(`Platform admin API failed: ${path}`);
  }
  return (await response.json()) as T;
}

export type PlatformNotificationSetting = {
  eventCode: string;
  adminEmailEnabled: boolean;
  userEmailEnabled: boolean;
  adminRecipientEmails: string[];
};

export type EmailDeliveryHealth = {
  emailEnabled: boolean;
  smtpProfile: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpAuthConfigured: boolean;
  smtpFrom: string;
  webPublicBaseUrl: string;
  defaultAdminRecipients: string[];
  deliveryMode: "mailpit" | "gmail" | "custom";
  lastVerifyOk: boolean | null;
  lastVerifyError: string | null;
  lastVerifiedAt: string | null;
};

export type EmailOutboxRow = {
  id: string;
  eventCode: string;
  recipientKind: string;
  recipientEmail: string;
  subject: string;
  status: string;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
  openCount?: number;
  clickCount?: number;
  bounceClass?: string | null;
};

export type EmailOutboxDetail = EmailOutboxRow & {
  locale: string;
  htmlBody: string;
  textBody: string;
  providerMessageId: string | null;
  metadata: Record<string, unknown> | null;
  openCount: number;
  clickCount: number;
  bounceClass: string | null;
  firstOpenedAt: string | null;
};

export type EmailOutboxDailyPoint = {
  day: string;
  enqueued: number;
  sent: number;
  failed: number;
  pending: number;
};

export type EmailOutboxEventBreakdownRow = {
  eventCode: string;
  sent: number;
  failed: number;
  pending: number;
  total: number;
};

export type EmailOutboxAnalyticsSummary = {
  days: number;
  enqueued: number;
  sent: number;
  failed: number;
  pending: number;
  successRatePercent: number | null;
  avgQueueSeconds: number | null;
  previousPeriod: {
    enqueued: number;
    sent: number;
    failed: number;
    successRatePercent: number | null;
  };
  maturityScorePercent: number;
  maturityTargetPercent: number;
  maturityPhase: string;
  engagement: {
    sentInPeriod: number;
    uniqueOpens: number;
    totalOpens: number;
    totalClicks: number;
    messagesWithClicks: number;
    bounces: number;
    openRatePercent: number | null;
    clickRatePercent: number | null;
    bounceRatePercent: number | null;
    bounceByClass: Record<string, number>;
  };
};

export type PlatformAdminOverview = {
  companies: number;
  users: number;
  listings: number;
  auctions: number;
  openAuctions: number;
  subscriptions: number;
  trustReviews: number;
  messageThreads: number;
  auditLogs: number;
  participantBreakdown: {
    loadShipper: number;
    loadCarrier: number;
    loadSeeker: number;
    other: number;
  };
  operationsIndex: {
    listings: number;
    auctions: number;
    messageThreads: number;
    trustReviews: number;
    auditLogs: number;
  };
};

export class PlatformAdminApiClient {
  public static async fetchOverview(accessToken: string): Promise<PlatformAdminOverview> {
    const payload = await adminFetch<{ overview: PlatformAdminOverview }>(
      accessToken,
      "overview",
    );
    return payload.overview;
  }

  public static async fetchCompanies(accessToken: string) {
    const payload = await adminFetch<{
      companies: {
        id: string;
        legalName: string;
        countryCode: string;
        participantTypeCode: string | null;
        userCount: number;
        listingCount: number;
        driverCount: number;
        vehicleCount: number;
        activePlanCode: string | null;
      }[];
    }>(accessToken, "companies");
    return payload.companies;
  }

  public static async fetchUsers(accessToken: string) {
    const payload = await adminFetch<{
      users: {
        id: string;
        emailAddress: string;
        displayName: string;
        companyId: string;
        companyLegalName: string;
        participantTypeCode: string | null;
        roleCodes: string[];
      }[];
    }>(accessToken, "users");
    return payload.users;
  }

  public static async fetchListings(accessToken: string) {
    const payload = await adminFetch<{
      listings: {
        id: string;
        ownerCompanyId: string;
        ownerLegalName: string;
        originCityName: string;
        destinationCityName: string;
        equipmentTypeCode: string;
        priceAmount: string | null;
        priceCurrencyCode: string | null;
        loadingDateStart: string;
      }[];
    }>(accessToken, "listings");
    return payload.listings;
  }

  public static async fetchAuctions(accessToken: string) {
    const payload = await adminFetch<{
      auctions: {
        id: string;
        statusCode: string;
        ownerCompanyId: string;
        freightListingId: string;
        minimumBidAmount: string;
        currencyCode: string;
        endsAt: string;
        bidCount: number;
      }[];
    }>(accessToken, "auctions");
    return payload.auctions;
  }

  public static async fetchSubscriptions(accessToken: string) {
    return adminFetch<{
      subscriptions: {
        id: string;
        companyId: string;
        companyLegalName: string;
        planCode: string;
        isActive: boolean;
        createdAt: string;
      }[];
      plans: {
        planCode: string;
        tierCode: string;
        includedModules?: string[];
        maxConcurrentSearchTabs?: number;
        laneAnalyticsHistoryDays?: number;
      }[];
    }>(accessToken, "subscriptions");
  }

  public static async fetchTrustReviews(accessToken: string) {
    const payload = await adminFetch<{
      reviews: {
        id: string;
        targetCompanyId: string;
        authorCompanyId: string;
        scoreValue: number;
        commentText: string;
        createdAt: string;
      }[];
    }>(accessToken, "trust-reviews");
    return payload.reviews;
  }

  public static async fetchAuditLogs(accessToken: string) {
    const payload = await adminFetch<{
      logs: {
        id: string;
        httpMethod: string;
        requestPath: string;
        responseStatusCode: number;
        actionCode: string;
        createdAt: string;
      }[];
    }>(accessToken, "audit-logs");
    return payload.logs;
  }

  public static async fetchNotificationSettings(
    accessToken: string,
  ): Promise<PlatformNotificationSetting[]> {
    const payload = await adminFetch<{ settings: PlatformNotificationSetting[] }>(
      accessToken,
      "notifications/settings",
    );
    return payload.settings;
  }

  public static async updateNotificationSetting(
    accessToken: string,
    body: Partial<PlatformNotificationSetting> & { eventCode: string },
  ): Promise<PlatformNotificationSetting> {
    const payload = await adminFetch<{ setting: PlatformNotificationSetting }>(
      accessToken,
      "notifications/settings",
      { method: "PATCH", body: JSON.stringify(body) },
    );
    return payload.setting;
  }

  public static async fetchEmailOutboxStats(
    accessToken: string,
  ): Promise<{
    sent: number;
    pending: number;
    failed: number;
    last24hSent: number;
  }> {
    const payload = await adminFetch<{
      stats: {
        sent: number;
        pending: number;
        failed: number;
        last24hSent: number;
      };
    }>(accessToken, "notifications/outbox/stats");
    return payload.stats;
  }

  public static async fetchEmailAnalyticsSummary(
    accessToken: string,
    days: 7 | 30,
  ): Promise<EmailOutboxAnalyticsSummary> {
    const payload = await adminFetch<{ summary: EmailOutboxAnalyticsSummary }>(
      accessToken,
      `notifications/analytics/summary?days=${days}`,
    );
    return payload.summary;
  }

  public static async fetchEmailAnalyticsDaily(
    accessToken: string,
    days: 7 | 30,
  ): Promise<EmailOutboxDailyPoint[]> {
    const payload = await adminFetch<{ series: EmailOutboxDailyPoint[] }>(
      accessToken,
      `notifications/analytics/daily?days=${days}`,
    );
    return payload.series;
  }

  public static async fetchEmailAnalyticsEvents(
    accessToken: string,
    days: 7 | 30,
  ): Promise<EmailOutboxEventBreakdownRow[]> {
    const payload = await adminFetch<{ events: EmailOutboxEventBreakdownRow[] }>(
      accessToken,
      `notifications/analytics/events?days=${days}`,
    );
    return payload.events;
  }

  public static async fetchEmailOutboxDetail(
    accessToken: string,
    id: string,
  ): Promise<EmailOutboxDetail> {
    const payload = await adminFetch<{ message: EmailOutboxDetail }>(
      accessToken,
      `notifications/outbox/${id}`,
    );
    return payload.message;
  }

  public static async fetchEmailOutboxExportBlob(
    accessToken: string,
    params: { days: 7 | 30; status?: string },
  ): Promise<Blob> {
    const query = new URLSearchParams({ days: String(params.days) });
    if (params.status && params.status !== "all") {
      query.set("status", params.status);
    }
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/platform-admin/notifications/outbox/export?${query}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!response.ok) {
      throw new Error("CSV export failed");
    }
    return response.blob();
  }

  public static async fetchNotificationOutbox(
    accessToken: string,
    limit = 50,
  ): Promise<EmailOutboxRow[]> {
    const payload = await adminFetch<{ messages: EmailOutboxRow[] }>(
      accessToken,
      `notifications/outbox?limit=${limit}`,
    );
    return payload.messages;
  }

  public static async sendTestNotificationEmail(
    accessToken: string,
    eventCode: string,
    recipientEmail: string,
  ): Promise<void> {
    await adminFetch(accessToken, "notifications/test", {
      method: "POST",
      body: JSON.stringify({ eventCode, recipientEmail }),
    });
  }

  public static async fetchEmailDeliveryHealth(
    accessToken: string,
  ): Promise<EmailDeliveryHealth> {
    const payload = await adminFetch<{ health: EmailDeliveryHealth }>(
      accessToken,
      "notifications/health",
    );
    return payload.health;
  }

  public static async verifyEmailSmtp(
    accessToken: string,
  ): Promise<{ ok: boolean; error?: string; health: EmailDeliveryHealth }> {
    return adminFetch(accessToken, "notifications/health/verify", {
      method: "POST",
    });
  }

  public static async drainEmailOutbox(
    accessToken: string,
  ): Promise<{ processed: number; sent: number; failed: number }> {
    return adminFetch(accessToken, "notifications/outbox/drain", {
      method: "POST",
    });
  }

  public static async retryFailedEmails(accessToken: string): Promise<{ retried: number }> {
    return adminFetch(accessToken, "notifications/outbox/retry-failed", {
      method: "POST",
    });
  }

  public static async fetchGmailStatus(accessToken: string): Promise<{
    status: GmailConnectionStatus;
    redirectUri: string;
  }> {
    return adminFetch(accessToken, "gmail/status");
  }

  public static async startGmailConnect(
    accessToken: string,
  ): Promise<{ ok: boolean; authUrl?: string; error?: string }> {
    return adminFetch(accessToken, "gmail/connect/start", { method: "POST" });
  }

  public static async fetchGmailMessages(
    accessToken: string,
    limit = 40,
  ): Promise<GmailInboxMessage[]> {
    const payload = await adminFetch<{ messages: GmailInboxMessage[] }>(
      accessToken,
      `gmail/messages?limit=${limit}`,
    );
    return payload.messages;
  }

  public static async disconnectGmail(accessToken: string): Promise<void> {
    await adminFetch(accessToken, "gmail/connection", { method: "DELETE" });
  }

  public static async fetchNotificationCatalog(
    accessToken: string,
  ): Promise<NotificationCatalogEvent[]> {
    const payload = await adminFetch<{ events: NotificationCatalogEvent[] }>(
      accessToken,
      "notifications/catalog",
    );
    return payload.events;
  }

  public static async fetchEmailSuppressions(
    accessToken: string,
  ): Promise<EmailSuppressionRow[]> {
    const payload = await adminFetch<{ suppressions: EmailSuppressionRow[] }>(
      accessToken,
      "notifications/suppressions",
    );
    return payload.suppressions;
  }

  public static async addEmailSuppression(
    accessToken: string,
    email: string,
    note?: string,
  ): Promise<void> {
    await adminFetch(accessToken, "notifications/suppressions", {
      method: "POST",
      body: JSON.stringify({ email, note }),
    });
  }

  public static async removeEmailSuppression(
    accessToken: string,
    email: string,
  ): Promise<void> {
    await adminFetch(
      accessToken,
      `notifications/suppressions?email=${encodeURIComponent(email)}`,
      { method: "DELETE" },
    );
  }

  public static async fetchEmailDeliveryInfo(accessToken: string): Promise<{
    mode: string;
    webhookUrls: { postmark: string; ses: string };
  }> {
    const payload = await adminFetch<{
      mode: string;
      webhookUrls: { postmark: string; ses: string };
    }>(accessToken, "notifications/delivery");
    return payload;
  }

  public static async syncGmailBounces(
    accessToken: string,
  ): Promise<{ scanned: number; suppressionsAdded: number }> {
    return adminFetch(accessToken, "gmail/sync-bounces?limit=80", {
      method: "POST",
    });
  }
}

export type NotificationCatalogEvent = {
  code: string;
  category: string;
  userPreferenceKey: string | null;
  defaultAdminEnabled: boolean;
  defaultUserEnabled: boolean;
  labelTr: string;
};

export type EmailSuppressionRow = {
  emailAddress: string;
  reason: string;
  source: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GmailConnectionStatus = {
  configured: boolean;
  connected: boolean;
  emailAddress: string | null;
  connectedAt: string | null;
};

export type GmailInboxMessage = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  receivedAt: string | null;
  labelIds: string[];
  gmailWebUrl: string;
};

export function formatParticipantType(code: string | null | undefined): string {
  switch (code) {
    case "LOAD_SHIPPER":
      return "Yük veren";
    case "LOAD_CARRIER":
      return "Yük taşıyan";
    case "LOAD_SEEKER":
      return "Yük arayan";
    default:
      return code ?? "—";
  }
}
