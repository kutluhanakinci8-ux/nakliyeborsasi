"use client";

import { useCallback, useEffect, useState } from "react";
import {
  startAuthentication,
} from "@simplewebauthn/browser";
import {
  fetchWebAuthnAuthOptions,
  verifyWebAuthnAuthentication,
} from "@/lib/mailApi";

const SESSION_KEY = "lerta-mail-biometric-unlock";

export function readMailAppLockSessionUnlocked(): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function writeMailAppLockSessionUnlocked(): void {
  sessionStorage.setItem(SESSION_KEY, "1");
}

type Props = {
  accessToken: string;
  appLockEnabled: boolean;
  hasPasskeys: boolean;
};

export function MailAppLockOverlay({
  accessToken,
  appLockEnabled,
  hasPasskeys,
}: Props) {
  const [unlocked, setUnlocked] = useState(() => readMailAppLockSessionUnlocked());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const shouldLock = appLockEnabled && hasPasskeys && !unlocked;

  const unlock = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const { options } = await fetchWebAuthnAuthOptions(accessToken);
      const response = await startAuthentication({ optionsJSON: options });
      await verifyWebAuthnAuthentication(accessToken, response);
      writeMailAppLockSessionUnlocked();
      setUnlocked(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Biyometrik doğrulama başarısız. Tekrar deneyin.",
      );
    } finally {
      setBusy(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!shouldLock || busy) {
      return;
    }
    const onVis = () => {
      if (document.visibilityState === "visible" && !readMailAppLockSessionUnlocked()) {
        setUnlocked(false);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [shouldLock, busy]);

  if (!shouldLock) {
    return null;
  }

  return (
    <div className="mail-app-lock-overlay" role="dialog" aria-modal="true" aria-labelledby="mail-app-lock-title">
      <div className="mail-app-lock-card">
        <span className="mail-app-lock-icon" aria-hidden="true">🔐</span>
        <h2 id="mail-app-lock-title" className="mail-app-lock-title">
          Posta kilitli
        </h2>
        <p className="mail-app-lock-lead">
          Bu oturumda postayı görmek için Face ID, Touch ID veya cihaz PIN ile
          doğrulayın (Outlook mobil biyometri benzeri).
        </p>
        {error ? (
          <p className="mail-accounts-status mail-accounts-status--err" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          className="mail-premium-btn mail-premium-btn--primary mail-app-lock-btn"
          disabled={busy}
          onClick={() => void unlock()}
        >
          {busy ? "Doğrulanıyor…" : "Kilidi aç"}
        </button>
      </div>
    </div>
  );
}
