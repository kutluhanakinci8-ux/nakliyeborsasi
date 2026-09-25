"use client";

import { useEffect, useState } from "react";
import {
  beginTotpSetup,
  confirmTotpSetup,
  fetchImapSettings,
  fetchTotpStatus,
  rotateImapPassword,
  type MailImapSettings,
} from "@/lib/mailApi";
import { MailComposePresetsPanel } from "./MailComposePresetsPanel";
import { fetchMailPushConfig } from "@/lib/mailApi";
import {
  subscribeMailWebPush,
  unsubscribeMailWebPush,
} from "@/lib/mailPush";

type Props = {
  accessToken: string;
  onClose: () => void;
};

export function MailSettingsPanel({ accessToken, onClose }: Props) {
  const [tab, setTab] = useState<
    "imap" | "presets" | "security" | "notifications"
  >("imap");
  const [pushStatus, setPushStatus] = useState<string>("");
  const [pushConfigured, setPushConfigured] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [settings, setSettings] = useState<MailImapSettings | null>(null);
  const [error, setError] = useState("");
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setSettings(await fetchImapSettings(accessToken));
        const totp = await fetchTotpStatus(accessToken);
        setTotpEnabled(totp.status.enabled);
        const push = await fetchMailPushConfig(accessToken);
        setPushConfigured(push.config.enabled);
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
        <h2>Ayarlar</h2>
        <div className="settings-tabs">
          <button
            type="button"
            className={tab === "imap" ? "active" : ""}
            onClick={() => setTab("imap")}
          >
            IMAP
          </button>
          <button
            type="button"
            className={tab === "presets" ? "active" : ""}
            onClick={() => setTab("presets")}
          >
            İmza / şablon
          </button>
          <button
            type="button"
            className={tab === "security" ? "active" : ""}
            onClick={() => setTab("security")}
          >
            2FA
          </button>
          <button
            type="button"
            className={tab === "notifications" ? "active" : ""}
            onClick={() => setTab("notifications")}
          >
            Bildirim
          </button>
        </div>
        {tab === "presets" ? (
          <MailComposePresetsPanel accessToken={accessToken} />
        ) : null}
        {tab === "notifications" ? (
          <>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              Yeni gelen posta için tarayıcı bildirimi (Web Push). HTTPS ve
              izin gerekir.
            </p>
            {!pushConfigured ? (
              <p>Sunucuda push henüz yapılandırılmamış (VAPID anahtarları).</p>
            ) : null}
            {pushStatus ? <p>{pushStatus}</p> : null}
            <div className="compose-actions">
              <button type="button" onClick={onClose}>Kapat</button>
              <button
                type="button"
                disabled={!pushConfigured}
                onClick={() =>
                  void (async () => {
                    setPushStatus("");
                    try {
                      const result = await subscribeMailWebPush(accessToken);
                      if (result === "enabled") {
                        setPushStatus("Bildirimler açıldı.");
                      } else if (result === "denied") {
                        setPushStatus("Tarayıcı bildirim izni reddedildi.");
                      } else if (result === "unsupported") {
                        setPushStatus("Bu tarayıcı Web Push desteklemiyor.");
                      } else {
                        setPushStatus("Push sunucuda kapalı.");
                      }
                    } catch (err) {
                      setPushStatus(
                        err instanceof Error
                          ? err.message
                          : "Abonelik başarısız.",
                      );
                    }
                  })()
                }
              >
                Bildirimleri aç
              </button>
              <button
                type="button"
                onClick={() =>
                  void (async () => {
                    try {
                      await unsubscribeMailWebPush(accessToken);
                      setPushStatus("Bildirimler kapatıldı.");
                    } catch {
                      setPushStatus("Kapatılamadı.");
                    }
                  })()
                }
              >
                Bildirimleri kapat
              </button>
            </div>
          </>
        ) : null}
        {tab === "security" ? (
          <>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              İki adımlı doğrulama (TOTP). Kapatmak için yönetim konsolu
              güvenlik sayfasını kullanın.
            </p>
            <p>{totpEnabled ? "TOTP açık." : "TOTP kapalı."}</p>
            {!totpEnabled && !totpSecret ? (
              <button
                type="button"
                onClick={() =>
                  void (async () => {
                    const data = await beginTotpSetup(accessToken);
                    setTotpSecret(data.setup.secret);
                  })()
                }
              >
                TOTP kur
              </button>
            ) : null}
            {totpSecret ? (
              <div style={{ marginTop: 12 }}>
                <p>
                  Secret: <code>{totpSecret}</code>
                </p>
                <input
                  placeholder="6 haneli kod"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                />
                <button
                  type="button"
                  style={{ marginLeft: 8 }}
                  onClick={() =>
                    void (async () => {
                      await confirmTotpSetup(accessToken, totpCode);
                      setTotpSecret(null);
                      setTotpEnabled(true);
                    })()
                  }
                >
                  Etkinleştir
                </button>
              </div>
            ) : null}
            <div className="compose-actions">
              <button type="button" onClick={onClose}>Kapat</button>
            </div>
          </>
        ) : null}
        {tab === "imap" ? (
          <>
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
          </>
        ) : null}
        {tab === "presets" ? (
          <div className="compose-actions">
            <button type="button" onClick={onClose}>Kapat</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
