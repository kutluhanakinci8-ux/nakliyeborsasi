import { PublicApiConfiguration } from "./PublicApiConfiguration";

async function adminFetch<T>(
  accessToken: string,
  path: string,
): Promise<T> {
  const response = await fetch(
    `${PublicApiConfiguration.resolveBaseUrl()}/platform-admin/${path}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) {
    throw new Error(`Platform admin API failed: ${path}`);
  }
  return (await response.json()) as T;
}

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
