import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import {
  findCompanyBid,
  getBestReverseBidAmount,
  rankReverseBids,
} from "./AuctionBidRules";

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

export function mapAuctionCompetition(
  session: AuctionSessionEntity,
  bids: readonly AuctionBidEntity[],
  viewerCompanyId: string,
  revealBidderIdentities: boolean,
): AuctionCompetitionSnapshot {
  const ranked = rankReverseBids(bids);
  const best = getBestReverseBidAmount(bids);
  const own = findCompanyBid(bids, viewerCompanyId);
  const ownRankEntry = ranked.find(
    (entry) => entry.bid.bidderCompanyId === viewerCompanyId,
  );

  return {
    bidCount: bids.length,
    bestBidAmount: best === null ? null : best.toFixed(2),
    myBidAmount: own ? own.bidAmount : null,
    myRank: ownRankEntry?.rank ?? null,
    leaderboard: ranked.map(({ bid, rank }) => ({
      rank,
      bidAmount: bid.bidAmount,
      isOwnCompany: bid.bidderCompanyId === viewerCompanyId,
      bidderCompanyId: revealBidderIdentities ? bid.bidderCompanyId : null,
    })),
  };
}
