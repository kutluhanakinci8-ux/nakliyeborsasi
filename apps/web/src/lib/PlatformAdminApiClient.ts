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
}

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
