import { PlatformException } from "./PlatformException";

export class AuctionSessionNotFoundException extends PlatformException {
  public constructor(auctionSessionId: string) {
    super(
      "AUCTION_SESSION_NOT_FOUND",
      `Auction session not found: ${auctionSessionId}`,
      404,
    );
  }
}
