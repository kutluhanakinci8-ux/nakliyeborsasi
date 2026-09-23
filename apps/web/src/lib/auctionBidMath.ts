export function parseBidAmount(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }
  const normalized = value.replace(",", ".").trim();
  return Number.parseFloat(normalized);
}

export function suggestNextReverseBid(params: {
  referenceCeiling: string;
  bidStepAmount: string | null;
  bestBidAmount: string | null;
}): number {
  const ceiling = parseBidAmount(params.referenceCeiling);
  const step = params.bidStepAmount
    ? parseBidAmount(params.bidStepAmount)
    : 50;
  const best = params.bestBidAmount
    ? parseBidAmount(params.bestBidAmount)
    : null;
  if (best === null || !Number.isFinite(best)) {
    return Math.max(Math.round((ceiling - step) * 100) / 100, step);
  }
  return Math.max(Math.round((best - step) * 100) / 100, 0.01);
}

export function formatRankLabel(rank: number | null): string {
  if (rank === null) {
    return "—";
  }
  return `L${rank}`;
}
