"use client";

import { useEffect, useState } from "react";
import {
  formatAuctionCountdownTr,
  isAuctionEndingSoon,
} from "../lib/auctionCountdown";

type AuctionCountdownProps = {
  endsAt: string;
  className?: string;
};

export function AuctionCountdown({ endsAt, className = "" }: AuctionCountdownProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const label = formatAuctionCountdownTr(endsAt, nowMs);
  const urgent = isAuctionEndingSoon(endsAt, nowMs);

  return (
    <span
      className={`auction-countdown ${urgent ? "auction-countdown--urgent" : ""} ${className}`.trim()}
      title="İhale teklif penceresi kapanana kalan süre"
    >
      Kalan: <strong>{label}</strong>
    </span>
  );
}
