export class AuctionSessionSummary {
  public readonly auctionSessionId: string;

  public readonly freightListingId: string;

  public readonly statusCode: string;

  public constructor(params: {
    auctionSessionId: string;
    freightListingId: string;
    statusCode: string;
  }) {
    this.auctionSessionId = params.auctionSessionId;
    this.freightListingId = params.freightListingId;
    this.statusCode = params.statusCode;
  }
}
