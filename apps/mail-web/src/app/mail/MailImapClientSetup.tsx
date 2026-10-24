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
  onReconcileMaildir?: () => void;
  reconcileBusy?: boolean;
};

function buildClientBundle(
  settings: MailImapSettings,
  password: string,
): string {
  const smtpSec = settings.smtpSecurity === "ssl" ? "SSL" : "STARTTLS";
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

function EndpointRow({
  icon,
  label,
  value,
  hint,
  onCopy,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  onCopy: () => void;
}) {
  return (
    <li className="mail-imap-endpoint">
      <span className="mail-imap-endpoint-icon" aria-hidden="true">{icon}</span>
      <div className="mail-imap-endpoint-main">
        <span className="mail-imap-endpoint-label">{label}</span>
        <code className="mail-imap-endpoint-value">{value}</code>
        {hint ? <p className="mail-imap-endpoint-hint">{hint}</p> : null}
      </div>
      <button
        type="button"
        className="mail-premium-btn mail-premium-btn--ghost mail-imap-copy-btn"
        onClick={onCopy}
      >
        Kopyala
      </button>
    </li>
  );
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
  onReconcileMaildir,
  reconcileBusy = false,
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
    return (
      <div className="mail-imap-panel mail-imap-panel--premium">
        <div className="mail-posta-skeleton" aria-busy="true">
          <div className="mail-posta-skeleton-line mail-posta-skeleton-line--lead" />
          <div className="mail-posta-skeleton-card" />
          <div className="mail-posta-skeleton-card" />
        </div>
      </div>
    );
  }

  if (!settings.enabled) {
    return (
      <div className="mail-imap-panel mail-imap-panel--premium">
        <p className="mail-posta-intro">
          Harici posta istemcileri için IMAP ve SMTP bilgileri bu alanda yönetilir.
        </p>
        <div className="mail-imap-empty" role="status">
          <span className="mail-imap-empty-icon" aria-hidden="true">📭</span>
          <p>IMAP bu kurulumda kapalı. Yöneticinize başvurun.</p>
        </div>
      </div>
    );
  }

  const needsSetup = settings.needsImapClientPassword ?? !settings.hasCredential;
  const smtpSecLabel =
    settings.smtpSecurity === "ssl" ? "(SSL)" : "(STARTTLS)";
  const imapEndpoint = `${settings.imapHost}:${settings.imapPort}${
    settings.imapTls ? " (SSL/TLS)" : ""
  }`;
  const smtpEndpoint = `${settings.smtpHost}:${settings.smtpPort} ${smtpSecLabel}`;
  const credentialUpdated = settings.credentialUpdatedAt
    ? new Date(settings.credentialUpdatedAt).toLocaleString("tr-TR")
    : null;

  return (
    <div className="mail-imap-panel mail-imap-panel--premium">
      <p className="mail-posta-intro">
        Masaüstü veya mobil posta uygulaması için sunucu bilgilerini buradan alın.
        Şifre yalnızca oluşturma veya yenileme anında gösterilir; VPS veya e-posta
        ile gönderilmez.
      </p>

      {copyHint ? (
        <p className="mail-accounts-status mail-accounts-status--ok" role="status">
          {copyHint}
        </p>
      ) : null}
      {error ? (
        <p className="mail-accounts-status mail-accounts-status--err" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mail-posta-card">
        <header className="mail-posta-card-head mail-imap-card-head">
          <div>
            <h3 className="mail-posta-card-title">Hesap durumu</h3>
            <p className="mail-posta-card-desc">
              Harici istemci şifresi ve son güncelleme bilgisi.
            </p>
          </div>
          <span
            className={
              needsSetup
                ? "mail-imap-pill mail-imap-pill--warn"
                : "mail-imap-pill mail-imap-pill--ok"
            }
          >
            {needsSetup ? "Kurulum gerekli" : "Hazır"}
          </span>
        </header>
        {needsSetup ? (
          <p className="mail-imap-status-text" role="status">
            <strong>İlk kurulum:</strong> Harici uygulama için IMAP şifresi henüz
            oluşturulmadı. Alttaki düğmeyle şifre üretin ve istemciye girin.
          </p>
        ) : (
          <p className="mail-imap-status-text" role="status">
            <strong>IMAP hazır.</strong> Şifre kayıtlı
            {credentialUpdated ? ` (son güncelleme: ${credentialUpdated})` : ""}.
            Unuttuysanız yeni şifre oluşturun.
          </p>
        )}
      </section>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">Bağlantı bilgileri</h3>
          <p className="mail-posta-card-desc">
            Thunderbird, Outlook ve mobil uygulamalara aynı değerleri girin.
          </p>
        </header>
        <ul className="mail-imap-endpoints">
          <EndpointRow
            icon="📥"
            label="Gelen (IMAP)"
            value={imapEndpoint}
            onCopy={() =>
              void copyText(
                "IMAP sunucu",
                `${settings.imapHost}:${settings.imapPort}`,
              )
            }
          />
          <EndpointRow
            icon="👤"
            label="Kullanıcı"
            value={settings.username ?? "—"}
            onCopy={() => {
              if (settings.username) {
                void copyText("Kullanıcı", settings.username);
              }
            }}
          />
          <EndpointRow
            icon="📤"
            label="Giden (SMTP)"
            value={smtpEndpoint}
            hint="Kimlik doğrulama: IMAP ile aynı kullanıcı ve şifre."
            onCopy={() =>
              void copyText(
                "SMTP sunucu",
                `${settings.smtpHost}:${settings.smtpPort}`,
              )
            }
          />
        </ul>
        <div className="mail-imap-folder-note">
          <span className="mail-imap-folder-note-label">Gönderilen klasörü</span>
          <p>{settings.sentFolderImapHint}</p>
        </div>
      </section>

      {newPassword ? (
        <section
          className="mail-posta-card mail-imap-password-card"
          aria-live="polite"
        >
          <header className="mail-posta-card-head">
            <h3 className="mail-posta-card-title">IMAP şifresi</h3>
            <p className="mail-posta-card-desc">
              Yalnızca bir kez gösterilir — sayfayı kapatmadan istemciye girin.
            </p>
          </header>
          <code className="mail-imap-password-value">{newPassword}</code>
          <div className="mail-imap-password-actions">
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--primary"
              onClick={() => void copyText("Şifre", newPassword)}
            >
              Şifreyi kopyala
            </button>
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--ghost"
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
        </section>
      ) : null}

      <section className="mail-posta-card mail-imap-actions-card">
        <div className="mail-imap-primary-actions">
          {needsSetup ? (
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--primary"
              disabled={loading}
              onClick={() => onProvision()}
            >
              {loading ? "Oluşturuluyor…" : "IMAP şifresi oluştur"}
            </button>
          ) : (
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--primary"
              disabled={loading}
              onClick={() => confirmRotate(onRotate)}
            >
              {loading ? "Yenileniyor…" : "IMAP şifresini yenile"}
            </button>
          )}
          {!needsSetup ? (
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--ghost"
              disabled={loading || !newPassword}
              onClick={() => {
                if (newPassword) {
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
          {onReconcileMaildir ? (
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--ghost"
              disabled={loading || reconcileBusy}
              onClick={() => onReconcileMaildir()}
            >
              {reconcileBusy
                ? "Maildir senkronu…"
                : "Arşiv/çöp iki yön senkron"}
            </button>
          ) : null}
        </div>
        <a
          className="mail-imap-help-link"
          href="/help/imap"
          target="_blank"
          rel="noopener noreferrer"
        >
          Thunderbird / Outlook kurulum rehberi →
        </a>
      </section>

      <section className="mail-posta-card mail-posta-card--muted">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">Outlook mobil (iOS / Android)</h3>
          <p className="mail-posta-card-desc">
            Microsoft Outlook uygulaması — IMAP ile aynı sunucu ve şifre.
          </p>
        </header>
        <ol className="mail-help-steps mail-imap-mobile-steps">
          <li>
            Outlook → <strong>Hesap ekle</strong> → <strong>Diğer hesap</strong> veya{" "}
            <strong>IMAP</strong>.
          </li>
          <li>
            E-posta ve yukarıdaki <strong>IMAP şifresi</strong> (web oturum şifresi değil).
          </li>
          <li>
            Gelen sunucu: ekrandaki host, port <strong>993</strong>, SSL/TLS açık.
          </li>
          <li>
            Giden (SMTP): ekrandaki host, port ve güvenlik (genelde <strong>587 STARTTLS</strong>).
          </li>
          <li>
            Uygulama içi <strong>biyometri / PIN</strong> Outlook tarafında; webmail için{" "}
            <strong>Ayarlar → Güvenlik → Passkey</strong>.
          </li>
        </ol>
        <a
          className="mail-imap-help-link"
          href="/help/imap#outlook-mobile"
          target="_blank"
          rel="noopener noreferrer"
        >
          Mobil adım adım rehber →
        </a>
      </section>
    </div>
  );
}
