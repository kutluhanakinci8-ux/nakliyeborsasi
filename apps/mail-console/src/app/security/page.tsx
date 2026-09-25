"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  beginTotpSetup,
  confirmTotpSetup,
  disableTotp,
  fetchMailSecurityPolicy,
  isPlatformOperator,
  updateMailSecurityPolicy,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

export default function SecurityPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [canManagePolicy, setCanManagePolicy] = useState(false);
  const [requireTotp, setRequireTotp] = useState(false);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const data = await fetchMailSecurityPolicy(accessToken);
    setEnabled(data.totp.enabled);
    setRequireTotp(data.policy.requireTotpForConsole);
    setCanManagePolicy(data.permissions.canManagePolicy);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void (async () => {
      try {
        setOperator(await isPlatformOperator(accessToken));
        await reload();
      } catch {
        setError("Güvenlik ayarları yüklenemedi.");
      }
    })();
  }, [accessToken, reload, router]);

  async function onBeginSetup() {
    if (!accessToken) {
      return;
    }
    setError("");
    setMessage("");
    try {
      const data = await beginTotpSetup(accessToken);
      setSetupSecret(data.setup.secret);
      setOtpauthUrl(data.setup.otpauthUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kurulum başlatılamadı");
    }
  }

  async function onConfirmSetup(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    try {
      await confirmTotpSetup(accessToken, confirmCode);
      setSetupSecret(null);
      setConfirmCode("");
      setMessage("İki adımlı doğrulama açıldı.");
      await reload();
    } catch {
      setError("Kod doğrulanamadı.");
    }
  }

  async function onDisable(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    try {
      await disableTotp(accessToken, disablePassword, disableCode);
      setMessage("İki adımlı doğrulama kapatıldı.");
      await reload();
    } catch {
      setError("Kapatma başarısız — şifre ve kod kontrol edin.");
    }
  }

  async function onTogglePolicy() {
    if (!accessToken || !canManagePolicy) {
      return;
    }
    try {
      const next = !requireTotp;
      await updateMailSecurityPolicy(accessToken, next);
      setRequireTotp(next);
      setMessage(
        next
          ? "Ekip için TOTP zorunlu — henüz açmayanlar konsol/webmail kullanamaz."
          : "TOTP zorunluluğu kaldırıldı.",
      );
    } catch {
      setError("Politika güncellenemedi.");
    }
  }

  return (
    <ConsoleShell operator={operator}>
      <h1>Güvenlik (TOTP)</h1>
      <p style={{ color: "var(--muted)", maxWidth: 720 }}>
        Google Authenticator veya benzeri uygulama ile iki adımlı doğrulama.
        Açıkken her girişte 6 haneli kod istenir.
      </p>
      {error ? <p className="error-banner">{error}</p> : null}
      {message ? <p style={{ color: "var(--ok)" }}>{message}</p> : null}

      <section className="card" style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Hesabınız</h2>
        {enabled ? (
          <p>TOTP <strong>açık</strong>.</p>
        ) : (
          <p>TOTP kapalı.</p>
        )}
        {!enabled && !setupSecret ? (
          <button type="button" className="btn" onClick={() => void onBeginSetup()}>
            TOTP kur
          </button>
        ) : null}
        {setupSecret ? (
          <form onSubmit={onConfirmSetup} style={{ marginTop: 16 }}>
            <p style={{ fontSize: "0.9rem" }}>
              Secret (manuel): <code>{setupSecret}</code>
            </p>
            {otpauthUrl ? (
              <p style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>
                <a href={otpauthUrl}>QR / otpauth bağlantısı</a>
              </p>
            ) : null}
            <label>
              İlk kod
              <input
                className="input"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn" style={{ marginTop: 12 }}>
              Etkinleştir
            </button>
          </form>
        ) : null}
        {enabled ? (
          <form onSubmit={onDisable} style={{ marginTop: 24 }}>
            <h3>TOTP kapat</h3>
            <label>
              Şifre
              <input
                className="input"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                required
              />
            </label>
            <label>
              Authenticator kodu
              <input
                className="input"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn danger" style={{ marginTop: 12 }}>
              Kapat
            </button>
          </form>
        ) : null}
      </section>

      {canManagePolicy ? (
        <section className="card" style={{ marginTop: 24 }}>
          <h2 style={{ marginTop: 0 }}>Firma politikası</h2>
          <p style={{ color: "var(--muted)" }}>
            Açıkken TOTP kurmayan kullanıcılar yönetim konsolu ve webmail API
            erişemez (önce burada TOTP açmalı).
          </p>
          <button type="button" className="btn secondary" onClick={() => void onTogglePolicy()}>
            {requireTotp ? "Zorunluluğu kaldır" : "TOTP zorunlu yap"}
          </button>
        </section>
      ) : null}
    </ConsoleShell>
  );
}
