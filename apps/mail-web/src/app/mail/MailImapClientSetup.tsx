"use client";

import type { MailImapSettings } from "@/lib/mailApi";

type Props = {
  settings: MailImapSettings | null;
  newPassword: string | null;
  loading: boolean;
  error: string;
  copyHint: string;
  onCopyHint: (msg: string) => void;
  onProvision: () => void;
  onRotate: () => void;
};

function buildClientBundle(
  settings: MailImapSettings,
  password: string,
): string {
  const smtpSec =
    settings.smtpSecurity === "ssl" ? "SSL" : "STARTTLS";
  return [
    "Lerta Posta — IMAP/SMTP",
    `Gelen (IMAP): ${settings.imapHost}:${settings.imapPort} (SSL/TLS)`,
    `Giden (SMTP): ${settings.smtpHost}:${settings.smtpPort} (${smtpSec})`,
    `Kullanıcı: ${settings.username ?? ""}`,
    `Şifre: ${password}`,
    "",
    "Şifreyi güvenli bir yerde saklayın; webmail dışında tekrar gösterilmez.",
  ].join("\n");
}

export function MailImapClientSetup({
  settings,
  newPassword,
  loading,
  error,
  copyHint,
  onCopyHint,
  onProvision,
  onRotate,
}: Props) {
  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      onCopyHint(`${label} kopyalandı.`);
      window.setTimeout(() => onCopyHint(""), 2500);
    } catch {
      onCopyHint("Kopyalanamadı.");
    }
  }

  function confirmRotate(action: () => void) {
    const hasCred = settings?.hasCredential;
    if (!hasCred) {
      action();
      return;
    }
    const ok = window.confirm(
      "Yeni şifre oluşturulduğunda Thunderbird, Outlook ve telefonunuzdaki eski şifre çalışmaz. Devam edilsin mi?",
    );
    if (ok) {
      action();
    }
  }

  if (!settings) {
    return <p>Yükleniyor…</p>;
  }

  if (!settings.enabled) {
    return (
      <p className="mail-imap-hint">
        IMAP bu kurulumda kapalı. Yöneticinize başvurun.
      </p>
    );
  }

  const needsSetup = settings.needsImapClientPassword ?? !settings.hasCredential;

  return (
    <>
      <p className="mail-settings-lead">
        Masaüstü veya mobil posta uygulaması için bilgileri buradan alın. Şifre
        yalnızca oluşturma/yenileme anında gösterilir — VPS veya e-posta ile
        gönderilmez.
      </p>
      {copyHint ? <p className="mail-imap-copy-hint">{copyHint}</p> : null}
      {error ? <p className="login-error">{error}</p> : null}

      {needsSetup ? (
        <div className="mail-imap-status mail-imap-status--warn" role="status">
          <strong>İlk kurulum:</strong> Harici uygulama için IMAP şifresi henüz
          oluşturulmadı. Aşağıdaki düğmeyle şifre üretin ve istemciye girin.
        </div>
      ) : (
        <div className="mail-imap-status mail-imap-status--ok" role="status">
          <strong>IMAP hazır.</strong> Şifre kayıtlı
          {settings.credentialUpdatedAt
            ? ` (son güncelleme: ${new Date(
                settings.credentialUpdatedAt,
              ).toLocaleString("tr-TR")})`
            : ""}
          . Unuttuysanız yeni şifre oluşturun.
        </div>
      )}

      <dl className="imap-dl">
        <dt>Gelen (IMAP)</dt>
        <dd>
          {settings.imapHost}:{settings.imapPort}{" "}
          {settings.imapTls ? "(SSL/TLS)" : ""}
          <button
            type="button"
            className="mail-copy-inline"
            onClick={() =>
              void copyText(
                "IMAP sunucu",
                `${settings.imapHost}:${settings.imapPort}`,
              )
            }
          >
            Kopyala
          </button>
        </dd>
        <dt>Kullanıcı</dt>
        <dd>
          {settings.username ?? "—"}
          {settings.username ? (
            <button
              type="button"
              className="mail-copy-inline"
              onClick={() => void copyText("Kullanıcı", settings.username!)}
            >
              Kopyala
            </button>
          ) : null}
        </dd>
        <dt>Giden (SMTP)</dt>
        <dd>
          {settings.smtpHost}:{settings.smtpPort}{" "}
          {settings.smtpSecurity === "ssl" ? "(SSL)" : "(STARTTLS)"}
          <button
            type="button"
            className="mail-copy-inline"
            onClick={() =>
              void copyText(
                "SMTP sunucu",
                `${settings.smtpHost}:${settings.smtpPort}`,
              )
            }
          >
            Kopyala
          </button>
          <div className="mail-imap-hint">
            Kimlik doğrulama: IMAP ile aynı kullanıcı ve şifre.
          </div>
        </dd>
        <dt>Gönderilen klasörü</dt>
        <dd className="mail-imap-hint">{settings.sentFolderImapHint}</dd>
      </dl>

      {newPassword ? (
        <div className="mail-imap-password-card">
          <p className="mail-imap-password-title">
            IMAP şifresi (yalnızca bir kez gösterilir)
          </p>
          <code className="mail-imap-password-value">{newPassword}</code>
          <div className="mail-imap-password-actions">
            <button
              type="button"
              className="mail-settings-theme-btn"
              onClick={() => void copyText("Şifre", newPassword)}
            >
              Şifreyi kopyala
            </button>
            <button
              type="button"
              className="mail-settings-theme-btn"
              onClick={() =>
                void copyText(
                  "Kurulum bilgisi",
                  buildClientBundle(settings, newPassword),
                )
              }
            >
              Tüm bilgileri kopyala
            </button>
          </div>
          <p className="mail-imap-hint">
            Bu sayfayı kapatmadan önce şifreyi Thunderbird, Outlook veya telefon
            ayarlarına girin.
          </p>
        </div>
      ) : null}

      <div className="compose-actions mail-imap-actions">
        {needsSetup ? (
          <button
            type="button"
            className="mail-imap-primary-btn"
            disabled={loading}
            onClick={() => onProvision()}
          >
            {loading ? "…" : "IMAP şifresi oluştur"}
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={() => confirmRotate(onRotate)}
          >
            {loading ? "…" : "IMAP şifresini yenile"}
          </button>
        )}
        {!needsSetup ? (
          <button
            type="button"
            className="mail-imap-ghost-btn"
            disabled={loading || !newPassword}
            onClick={() => {
              if (settings && newPassword) {
                void copyText(
                  "Kurulum bilgisi",
                  buildClientBundle(settings, newPassword),
                );
              }
            }}
          >
            Son şifreyi tekrar kopyala
          </button>
        ) : null}
      </div>

      <p className="mail-imap-hint">
        <a href="/help/imap" target="_blank" rel="noopener noreferrer">
          Thunderbird / Outlook kurulum rehberi
        </a>
      </p>
    </>
  );
}
