/** İhale iş modeli (Lardi BIDS / FIXED_PRICE benzeri). */
export const AuctionTypeCode = {
  ReverseOpen: "REVERSE_OPEN",
  FixedAccept: "FIXED_ACCEPT",
} as const;

export type AuctionTypeCode =
  (typeof AuctionTypeCode)[keyof typeof AuctionTypeCode];
