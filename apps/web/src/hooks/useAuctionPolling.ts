"use client";

import { useEffect, useRef } from "react";

type UseAuctionPollingOptions = {
  enabled: boolean;
  intervalMs: number;
  onTick: () => void | Promise<void>;
};

export function useAuctionPolling({
  enabled,
  intervalMs,
  onTick,
}: UseAuctionPollingOptions): void {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const id = window.setInterval(() => {
      void onTickRef.current();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);
}
