"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "../../lib/AccountNotificationPreferencesApi";

type Props = {
  accessToken: string;
  /** Sohbet üstü kompakt şerit */
  variant?: "compact" | "panel" | "profile";
};

export function MessagingAiProcessingConsentCard({
  accessToken,
  variant = "panel",
}: Props) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const reload = useCallback(async () => {
    const prefs = await fetchNotificationPreferences(accessToken);
    setConsent(Boolean(prefs.aiMailAssistConsent));
  }, [accessToken]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await reload();
      } catch {
        setMessage("Rıza durumu yüklenemedi.");
      } finally {
        setLoading(false);
      }
    })();
  }, [reload]);

  async function onToggle(next: boolean): Promise<void> {
    setBusy(true);
    setMessage("");
    try {
      const prefs = await updateNotificationPreferences(accessToken, {
        aiMailAssistConsent: next,
      });
      setConsent(Boolean(prefs.aiMailAssistConsent));
      setMessage(
        next
          ? "AI ve ses işleme rızası verildi."
          : "AI ve ses işleme rızası kapatıldı.",
      );
    } catch {
      setMessage("Kaydedilemedi. Oturumu yenileyip tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  const rootClass =
    variant === "compact"
      ? "messaging-ai-consent messaging-ai-consent--compact"
      : variant === "profile"
        ? "messaging-ai-consent messaging-ai-consent--profile"
        : "messaging-ai-consent";

  if (loading) {
    return (
      <div className={rootClass} role="status">
        <p className="module-hint">AI rızası yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className={rootClass} role="region" aria-label="AI ve ses işleme rızası">
      <div className="messaging-ai-consent-head">
        <h4 className="messaging-ai-consent-title">AI ve ses işleme (KVKK)</h4>
        <span
          className={
            consent
              ? "messaging-ai-consent-pill messaging-ai-consent-pill--on"
              : "messaging-ai-consent-pill"
          }
        >
          {consent ? "Onaylı" : "Kapalı"}
        </span>
      </div>
      <p className="messaging-ai-consent-lead">
        Sesli mesajı yazıya çevirme, sohbet AI özetleri ve benzeri özellikler için
        gerekir. Veriler firma politikası ve KVKK kapsamında işlenir.
      </p>
      <label className="messaging-ai-consent-toggle">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(event) => void onToggle(event.target.checked)}
        />
        <span>Ses ve metin AI işleme rızası veriyorum</span>
      </label>
      {message ? (
        <p className="messaging-ai-consent-status" role="status">{message}</p>
      ) : null}
      {!consent && variant === "compact" ? (
        <p className="messaging-ai-consent-hint" role="note">
          “Yazıya çevir” kullanmak için bu onayı açın.
        </p>
      ) : null}
    </div>
  );
}
