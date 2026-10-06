"use client";

import { useEffect, useState } from "react";
import {
  MessagingIntegrationApiClient,
  type MessagingWhatsappBridgeSnapshot,
} from "../lib/MessagingIntegrationApiClient";

export function useMessagingWhatsappBridgeSnapshot(
  accessToken: string,
  enabled: boolean,
): {
  bridge: MessagingWhatsappBridgeSnapshot | null;
  loading: boolean;
  error: string;
  reload: () => void;
} {
  const [bridge, setBridge] = useState<MessagingWhatsappBridgeSnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || !accessToken) {
      setBridge(null);
      setError("");
      return;
    }
    setLoading(true);
    void MessagingIntegrationApiClient.fetchSnapshot(accessToken)
      .then((payload) => {
        setBridge(payload.integration.whatsappBridge);
        setError("");
      })
      .catch(() => {
        setBridge(null);
        setError("WhatsApp köprü durumu alınamadı");
      })
      .finally(() => setLoading(false));
  }, [accessToken, enabled, tick]);

  return {
    bridge,
    loading,
    error,
    reload: () => setTick((value) => value + 1),
  };
}
