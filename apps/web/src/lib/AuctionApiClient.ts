import { AuthenticatedApiClient } from "./AuthenticatedApiClient";

export type AuctionBidRecord = {
  id: string;
  bidderCompanyId: string;
  bidAmount: string;
  createdAt?: string;
};

export type AuctionSessionRecord = {
  id: string;
  freightListingId: string;
  minimumBidAmount: string;
  currencyCode: string;
  endsAt: string;
  statusCode: string;
  winningBidId: string | null;
  bids?: AuctionBidRecord[];
};

export type AuctionListingPoint = {
  countryCode: string;
  cityName: string;
  placeName?: string | null;
  placeKindCode?: string | null;
};

export type AuctionSessionDetail = {
  session: AuctionSessionRecord & {
    ownerCompanyId: string;
    createdAt: string;
    bids: (AuctionBidRecord & { createdAt: string })[];
  };
  listing: {
    listingId: string;
    ownerCompanyId: string;
    origin: AuctionListingPoint;
    destination: AuctionListingPoint;
    equipmentType: string;
    weightTonnes: number;
    loadingDateStart: string;
    marketScope: string;
    price: { amount: number; currencyCode: string } | null;
  };
  ownerCompany: {
    companyId: string;
    legalName: string;
    countryCode: string;
    participantTypeCode: string | null;
    trustScore: number;
    trustReviewCount: number;
  };
};

export class AuctionApiClient {
  public static async getSessionDetail(
    accessToken: string,
    locale: string,
    auctionSessionId: string,
  ): Promise<AuctionSessionDetail> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/auctions/sessions/${encodeURIComponent(auctionSessionId)}?lang=${locale}`,
    ) as Promise<AuctionSessionDetail>;
  }

  public static async listSessions(
    accessToken: string,
    locale: string,
    status: "open" | "closed" | "all",
  ): Promise<{ sessions: AuctionSessionRecord[] }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/auctions/sessions?status=${status}&lang=${locale}`,
    ) as Promise<{ sessions: AuctionSessionRecord[] }>;
  }

  public static async createSession(
    accessToken: string,
    locale: string,
    payload: {
      freightListingId: string;
      minimumBidAmount: number;
      currencyCode: string;
      durationHours: number;
    },
  ): Promise<void> {
    await AuthenticatedApiClient.fetchJson(
      accessToken,
      `/auctions/sessions?lang=${locale}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  }

  public static async placeBid(
    accessToken: string,
    locale: string,
    auctionSessionId: string,
    bidAmount: number,
  ): Promise<void> {
    await AuthenticatedApiClient.fetchJson(
      accessToken,
      `/auctions/sessions/${auctionSessionId}/bids?lang=${locale}`,
      {
        method: "POST",
        body: JSON.stringify({ bidAmount }),
      },
    );
  }
}
