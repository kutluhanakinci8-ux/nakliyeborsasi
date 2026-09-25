"use client";

import { useEffect, useState } from "react";
import {
  fetchImapSettings,
  rotateImapPassword,
  type MailImapSettings,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  onClose: () => void;
};

export function MailSettingsPanel({ accessToken, onClose }: Props) {
  const [settings, setSettings] = useState<MailImapSettings | null>(null);
  const [error, setError] = useState("");
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setSettings(await fetchImapSettings(accessToken));
      } catch {
        setError("IMAP ayarları yüklenemedi.");
      }
    })();
  }, [accessToken]);

  async function onRotate() {
    setError("");
    setNewPassword(null);
    setLoading(true);
    try {
      const creds = await rotateImapPassword(accessToken);
      setNewPassword(creds.password);
      setSettings(await fetchImapSettings(accessToken));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Şifre oluşturulamadı (firma sahibi gerekli).",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="compose-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="compose-dialog"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>IMAP / Outlook</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          Masaüstü istemci (Thunderbird, Outlook) ile kutunuza bağlanın.
        </p>
        {error ? <p className="login-error">{error}</p> : null}
        {settings ? (
          <dl className="imap-dl">
            <dt>Durum</dt>
            <dd>{settings.enabled ? "Aktif" : "Sunucuda kapalı"}</dd>
            <dt>Sunucu</dt>
            <dd>
              {settings.imapHost}:{settings.imapPort}{" "}
              {settings.imapTls ? "(SSL/TLS)" : ""}
            </dd>
            <dt>Kullanıcı</dt>
            <dd>{settings.username ?? "—"}</dd>
            <dt>Şifre</dt>
            <dd>
              {settings.hasCredential
                ? "Kayıtlı (güvenlik için gösterilmez)"
                : "Henüz oluşturulmadı"}
            </dd>
          </dl>
        ) : (
          <p>Yükleniyor…</p>
        )}
        {newPassword ? (
          <p
            style={{
              background: "#fff8e1",
              padding: 12,
              borderRadius: 8,
              wordBreak: "break-all",
            }}
          >
            Yeni şifre (bir kez gösterilir): <strong>{newPassword}</strong>
          </p>
        ) : null}
        <div className="compose-actions">
          <button type="button" onClick={onClose}>Kapat</button>
          <button
            type="button"
            disabled={loading || !settings?.enabled}
            onClick={() => void onRotate()}
          >
            {loading ? "…" : "IMAP şifresi oluştur / yenile"}
          </button>
        </div>
      </div>
    </div>
  );
}
