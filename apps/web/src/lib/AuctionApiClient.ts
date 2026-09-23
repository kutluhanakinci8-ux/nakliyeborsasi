import { AuthenticatedApiClient } from "./AuthenticatedApiClient";

export type AuctionBidRecord = {
  id: string;
  bidderCompanyId: string;
  bidAmount: string;
  createdAt?: string;
};

export type AuctionCompetitionSnapshot = {
  bidCount: number;
  bestBidAmount: string | null;
  myBidAmount: string | null;
  myRank: number | null;
  leaderboard: {
    rank: number;
    bidAmount: string;
    isOwnCompany: boolean;
    bidderCompanyId: string | null;
  }[];
};

export type AuctionListingSummary = {
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

export type AuctionSessionRecord = {
  id: string;
  freightListingId: string;
  minimumBidAmount: string;
  currencyCode: string;
  endsAt: string;
  statusCode: string;
  winningBidId: string | null;
  auctionTypeCode?: string;
  bids?: AuctionBidRecord[];
  competition?: AuctionCompetitionSnapshot;
  listing?: AuctionListingSummary | null;
  bidStepAmount?: string | null;
  paymentFormCode?: string | null;
  paymentDeferDays?: number | null;
  priceIncludesVat?: boolean;
  cargoDescription?: string | null;
};

export type AuctionListingPoint = {
  countryCode: string;
  cityName: string;
  placeName?: string | null;
  placeKindCode?: string | null;
};

export type AuctionSessionTermsFields = {
  termsSummary: string | null;
  specDocumentUrl: string | null;
  specDocumentLabel: string | null;
  paymentFormCode: string | null;
  paymentDeferDays: number | null;
  priceIncludesVat: boolean;
  bidStepAmount: string | null;
  cargoDescription: string | null;
};

export type AuctionSessionDetail = {
  session: AuctionSessionRecord &
    AuctionSessionTermsFields & {
      ownerCompanyId: string;
      createdAt: string;
      auctionTypeCode: string;
      autoExtendMinutes: number;
      autoExtendWindowMinutes: number;
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
  competition: AuctionCompetitionSnapshot;
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
      termsSummary?: string;
      specDocumentUrl?: string;
      specDocumentLabel?: string;
      paymentFormCode?: string;
      paymentDeferDays?: number;
      priceIncludesVat?: boolean;
      bidStepAmount?: number;
      cargoDescription?: string;
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

  public static async getSessionLive(
    accessToken: string,
    locale: string,
    auctionSessionId: string,
  ): Promise<{
    sessionId: string;
    statusCode: string;
    endsAt: string;
    competition: AuctionCompetitionSnapshot;
  }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/auctions/sessions/${encodeURIComponent(auctionSessionId)}/live?lang=${locale}`,
    ) as Promise<{
      sessionId: string;
      statusCode: string;
      endsAt: string;
      competition: AuctionCompetitionSnapshot;
    }>;
  }

  public static async acceptFixedListingPrice(
    accessToken: string,
    locale: string,
    freightListingId: string,
  ): Promise<{ sessionId: string; bidId: string }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/auctions/listings/${encodeURIComponent(freightListingId)}/fixed-accept?lang=${locale}`,
      { method: "POST" },
    ) as Promise<{ sessionId: string; bidId: string }>;
  }

  public static async sendListingPriceOffer(
    accessToken: string,
    locale: string,
    freightListingId: string,
    payload: { offerAmount: number; currencyCode: string; note?: string },
  ): Promise<{ threadId: string; messageId: string }> {
    return AuthenticatedApiClient.fetchJson(
      accessToken,
      `/auctions/listings/${encodeURIComponent(freightListingId)}/price-offer?lang=${locale}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ) as Promise<{ threadId: string; messageId: string }>;
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
