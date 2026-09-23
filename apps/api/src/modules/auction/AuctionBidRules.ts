import { AuctionTypeCode } from "@nakliyeborsasi/core";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";

export type AuctionBidValidationResult =
  | { ok: true }
  | { ok: false; reasonCode: string };

function parseMoney(value: string): number {
  return Number.parseFloat(value);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getBestReverseBidAmount(
  bids: readonly AuctionBidEntity[],
): number | null {
  if (bids.length === 0) {
    return null;
  }
  return bids.reduce((best, bid) => {
    const amount = parseMoney(bid.bidAmount);
    return best === null || amount < best ? amount : best;
  }, null as number | null);
}

export function rankReverseBids(
  bids: readonly AuctionBidEntity[],
): { bid: AuctionBidEntity; rank: number }[] {
  const sorted = [...bids].sort((a, b) => {
    const diff = parseMoney(a.bidAmount) - parseMoney(b.bidAmount);
    if (diff !== 0) {
      return diff;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return sorted.map((bid, index) => ({ bid, rank: index + 1 }));
}

export function findCompanyBid(
  bids: readonly AuctionBidEntity[],
  companyId: string,
): AuctionBidEntity | null {
  const companyBids = bids.filter((b) => b.bidderCompanyId === companyId);
  if (companyBids.length === 0) {
    return null;
  }
  return companyBids.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];
}

export function validateReverseBidAmount(
  session: AuctionSessionEntity,
  bids: readonly AuctionBidEntity[],
  bidderCompanyId: string,
  bidAmount: number,
): AuctionBidValidationResult {
  if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
    return { ok: false, reasonCode: "invalid_amount" };
  }
  const referenceCeiling = parseMoney(session.minimumBidAmount);
  const step = session.bidStepAmount
    ? parseMoney(session.bidStepAmount)
    : 1;
  const best = getBestReverseBidAmount(
    bids.filter((b) => b.bidderCompanyId !== bidderCompanyId),
  );
  const ownBid = findCompanyBid(bids, bidderCompanyId);

  if (best === null) {
    if (bidAmount > referenceCeiling) {
      return { ok: false, reasonCode: "above_reference" };
    }
    const maxFirst = roundMoney(referenceCeiling);
    if (bidAmount > maxFirst) {
      return { ok: false, reasonCode: "above_reference" };
    }
    return { ok: true };
  }

  const maxAllowed = roundMoney(best - step);
  if (bidAmount > maxAllowed) {
    return { ok: false, reasonCode: "above_best_minus_step" };
  }
  if (ownBid && bidAmount >= parseMoney(ownBid.bidAmount)) {
    return { ok: false, reasonCode: "must_improve_own_bid" };
  }
  return { ok: true };
}

export function validateBidForSession(
  session: AuctionSessionEntity,
  bids: readonly AuctionBidEntity[],
  bidderCompanyId: string,
  bidAmount: number,
): AuctionBidValidationResult {
  if (session.auctionTypeCode === AuctionTypeCode.FixedAccept) {
    const fixed = parseMoney(session.minimumBidAmount);
    if (roundMoney(bidAmount) !== roundMoney(fixed)) {
      return { ok: false, reasonCode: "fixed_price_mismatch" };
    }
    return { ok: true };
  }
  return validateReverseBidAmount(session, bids, bidderCompanyId, bidAmount);
}

export function suggestNextReverseBidAmount(
  session: AuctionSessionEntity,
  bids: readonly AuctionBidEntity[],
): number {
  const referenceCeiling = parseMoney(session.minimumBidAmount);
  const step = session.bidStepAmount
    ? parseMoney(session.bidStepAmount)
    : 50;
  const best = getBestReverseBidAmount(bids);
  if (best === null) {
    return roundMoney(Math.max(referenceCeiling - step, step));
  }
  return roundMoney(Math.max(best - step, 0.01));
}
