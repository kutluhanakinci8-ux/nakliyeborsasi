import { AuthenticatedApiClient } from "./AuthenticatedApiClient";

export type AuctionBidRecord = {
  id: string;
  bidderCompanyId: string;
  bidAmount: string;
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

export class AuctionApiClient {
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
