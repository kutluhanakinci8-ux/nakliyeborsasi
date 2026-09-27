"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  beginTotpSetup,
  confirmTotpSetup,
  fetchImapSettings,
  fetchTotpStatus,
  rotateImapPassword,
  type MailImapSettings,
} from "@/lib/mailApi";
import { MailComposePresetsPanel } from "./MailComposePresetsPanel";
import { MailRulesPanel } from "./MailRulesPanel";
import {
  fetchInboxPreferences,
  fetchMailPushConfig,
  updateInboxPreferences,
} from "@/lib/mailApi";
import {
  subscribeMailWebPush,
  unsubscribeMailWebPush,
} from "@/lib/mailPush";
import {
  isMailNotifySoundEnabled,
  playMailNotifyBeep,
  setMailNotifySoundEnabled,
} from "@/lib/mailNotifySound";
import {
  applyMailTheme,
  initMailTheme,
  type MailTheme,
} from "@/lib/mailTheme";

type SettingsView =
  | "hub"
  | "display"
  | "signature"
  | "autoReply"
  | "notifications"
  | "imap"
  | "rules"
  | "security"
  | "privacy"
  | "help";

type HubItem = {
  id: SettingsView;
  section: "quick" | "general" | "other";
  label: string;
  subtitle: string;
  keywords: string;
  disabled?: boolean;
};

const HUB_ITEMS: HubItem[] = [
  {
    id: "display",
    section: "quick",
    label: "Ekran ve görünüm",
    subtitle: "Açık ve koyu tema",
    keywords: "tema görünüm dark light",
  },
  {
    id: "signature",
    section: "quick",
    label: "İmza ve şablon",
    subtitle: "Gönderim ön ayarları",
    keywords: "imza şablon compose",
  },
  {
    id: "autoReply",
    section: "quick",
    label: "Otomatik yanıtlar",
    subtitle: "Tatil / toplantı mesajı",
    keywords: "tatil toplantı oof vacation",
  },
  {
    id: "notifications",
    section: "quick",
    label: "Bildirimler ve sesler",
    subtitle: "Push, ses, günlük özet",
    keywords: "bildirim push ses digest",
  },
  {
    id: "imap",
    section: "general",
    label: "IMAP ve SMTP",
    subtitle: "Thunderbird, Outlook masaüstü",
    keywords: "imap smtp thunderbird outlook hesap",
  },
  {
    id: "rules",
    section: "general",
    label: "Posta kuralları",
    subtitle: "Gelen kutusu otomasyonu",
    keywords: "kural filtre yönlendir",
  },
  {
    id: "security",
    section: "general",
    label: "Güvenlik",
    subtitle: "İki adımlı doğrulama (TOTP)",
    keywords: "2fa totp güvenlik",
  },
  {
    id: "privacy",
    section: "general",
    label: "Gizlilik",
    subtitle: "KVKK ve veri hakları",
    keywords: "kvkk gizlilik veri",
  },
  {
    id: "help",
    section: "other",
    label: "Yardım",
    subtitle: "IMAP kurulum rehberi",
    keywords: "yardım destek imap",
  },
];

type Props = {
  accessToken: string;
  onClose: () => void;
  onOpenCalendar?: () => void;
  onOpenContacts?: () => void;
};

export function MailSettingsPanel({
  accessToken,
  onClose,
  onOpenCalendar,
  onOpenContacts,
}: Props) {
  const [view, setView] = useState<SettingsView>("hub");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<MailTheme>("light");
  const [pushStatus, setPushStatus] = useState("");
  const [pushConfigured, setPushConfigured] = useState(false);
  const [notifySound, setNotifySound] = useState(false);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyBodyText, setAutoReplyBodyText] = useState("");
  const [autoReplyActiveFrom, setAutoReplyActiveFrom] = useState("");
  const [autoReplyActiveUntil, setAutoReplyActiveUntil] = useState("");
  const [autoReplyStatus, setAutoReplyStatus] = useState("");
  const [autoReplySaving, setAutoReplySaving] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [settings, setSettings] = useState<MailImapSettings | null>(null);
  const [error, setError] = useState("");
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copyHint, setCopyHint] = useState("");

  useEffect(() => {
    setTheme(initMailTheme());
    setNotifySound(isMailNotifySoundEnabled());
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setSettings(await fetchImapSettings(accessToken));
        const totp = await fetchTotpStatus(accessToken);
        setTotpEnabled(totp.status.enabled);
        const push = await fetchMailPushConfig(accessToken);
        setPushConfigured(push.config.enabled);
        const prefs = await fetchInboxPreferences(accessToken);
        setDailyDigest(prefs.preferences.dailyDigestEnabled);
        setAutoReplyEnabled(prefs.preferences.autoReplyEnabled);
        setAutoReplyBodyText(prefs.preferences.autoReplyBodyText ?? "");
        setAutoReplyActiveFrom(
          toDatetimeLocalValue(prefs.preferences.autoReplyActiveFrom),
        );
        setAutoReplyActiveUntil(
          toDatetimeLocalValue(prefs.preferences.autoReplyActiveUntil),
        );
      } catch {
        setError("Ayarlar yüklenemedi.");
      }
    })();
  }, [accessToken]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return HUB_ITEMS;
    }
    return HUB_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.keywords.includes(q),
    );
  }, [query]);

  const hubSections: { key: HubItem["section"]; title: string }[] = [
    { key: "quick", title: "Hızlı ayarlar" },
    { key: "general", title: "Genel" },
    { key: "other", title: "Diğer" },
  ];

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

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyHint(`${label} kopyalandı.`);
      window.setTimeout(() => setCopyHint(""), 2500);
    } catch {
      setCopyHint("Kopyalanamadı.");
    }
  }

  function openHubItem(item: HubItem) {
    if (item.disabled) {
      return;
    }
    if (item.id === "help") {
      window.open("/help/imap", "_blank", "noopener,noreferrer");
      return;
    }
    setView(item.id);
  }

  function renderHub() {
    return (
      <>
        <div className="mail-settings-header mail-settings-header--hub">
          <button
            type="button"
            className="mail-settings-close"
            onClick={onClose}
            aria-label="Kapat"
          >
            ×
          </button>
          <h2 className="mail-settings-title">Ayarlar</h2>
        </div>
        <input
          className="mail-settings-search"
          type="search"
          placeholder="Ara"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Ayarları ara"
        />
        <div className="mail-settings-scroll">
          {onOpenCalendar || onOpenContacts ? (
            <section className="mail-settings-group">
              <h3 className="mail-settings-group-title">Posta ve takvim</h3>
              <ul className="mail-settings-list">
                {onOpenCalendar ? (
                  <li>
                    <button
                      type="button"
                      className="mail-settings-row"
                      onClick={() => {
                        onOpenCalendar();
                        onClose();
                      }}
                    >
                      <span className="mail-settings-row-icon" aria-hidden>
                        📅
                      </span>
                      <span className="mail-settings-row-text">
                        <strong>Takvim</strong>
                        <small>CalDAV ve ICS beslemeleri</small>
                      </span>
                      <span className="mail-settings-chevron" aria-hidden>
                        ›
                      </span>
                    </button>
                  </li>
                ) : null}
                {onOpenContacts ? (
                  <li>
                    <button
                      type="button"
                      className="mail-settings-row"
                      onClick={() => {
                        onOpenContacts();
                        onClose();
                      }}
                    >
                      <span className="mail-settings-row-icon" aria-hidden>
                        👥
                      </span>
                      <span className="mail-settings-row-text">
                        <strong>Kişiler</strong>
                        <small>CardDAV ve rehber</small>
                      </span>
                      <span className="mail-settings-chevron" aria-hidden>
                        ›
                      </span>
                    </button>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}
          {hubSections.map((section) => {
            const items = filteredItems.filter((i) => i.section === section.key);
            if (items.length === 0) {
              return null;
            }
            return (
              <section key={section.key} className="mail-settings-group">
                <h3 className="mail-settings-group-title">{section.title}</h3>
                <ul className="mail-settings-list">
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={
                          item.disabled
                            ? "mail-settings-row mail-settings-row--muted"
                            : "mail-settings-row"
                        }
                        onClick={() => openHubItem(item)}
                      >
                        <span className="mail-settings-row-icon" aria-hidden>
                          {settingsRowIcon(item.id)}
                        </span>
                        <span className="mail-settings-row-text">
                          <strong>{item.label}</strong>
                          <small>
                            {item.id === "notifications" && pushConfigured
                              ? "Push yapılandırıldı"
                                : item.id === "security"
                                ? totpEnabled
                                  ? "TOTP açık"
                                  : "TOTP kapalı"
                                : item.id === "autoReply"
                                  ? autoReplyEnabled
                                    ? "Açık"
                                    : "Kapalı"
                                : item.subtitle}
                          </small>
                        </span>
                        <span className="mail-settings-chevron" aria-hidden>
                          ›
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {filteredItems.length === 0 ? (
            <p className="mail-settings-empty">Sonuç bulunamadı.</p>
          ) : null}
        </div>
      </>
    );
  }

  function renderDetail(title: string, body: ReactNode) {
    return (
      <>
        <div className="mail-settings-header">
          <button
            type="button"
            className="mail-settings-back"
            onClick={() => setView("hub")}
            aria-label="Geri"
          >
            ←
          </button>
          <h2 className="mail-settings-title">{title}</h2>
          <button
            type="button"
            className="mail-settings-close"
            onClick={onClose}
            aria-label="Kapat"
          >
            ×
          </button>
        </div>
        <div className="mail-settings-scroll mail-settings-detail">{body}</div>
      </>
    );
  }

  let content: ReactNode;
  switch (view) {
    case "hub":
      content = renderHub();
      break;
    case "display":
      content = renderDetail(
        "Ekran ve görünüm",
        <>
          <p className="mail-settings-lead">
            Webmail teması. Tercih tarayıcıda saklanır.
          </p>
          <div className="mail-settings-theme-options">
            {(["light", "dark"] as MailTheme[]).map((option) => (
              <button
                key={option}
                type="button"
                className={
                  theme === option
                    ? "mail-settings-theme-btn active"
                    : "mail-settings-theme-btn"
                }
                onClick={() => {
                  applyMailTheme(option);
                  setTheme(option);
                }}
              >
                {option === "light" ? "Açık" : "Koyu"}
              </button>
            ))}
          </div>
        </>,
      );
      break;
    case "signature":
      content = renderDetail(
        "İmza ve şablon",
        <MailComposePresetsPanel accessToken={accessToken} />,
      );
      break;
    case "autoReply":
      content = renderDetail(
        "Otomatik yanıtlar",
        <>
          <p className="mail-settings-lead">
            Gelen postaya otomatik yanıt (Outlook «Otomatik yanıtlar»). Aynı
            gönderene 24 saatte en fazla bir yanıt; spam ve kurumsal
            adreslere gönderilmez.
          </p>
          <label className="mail-settings-check">
            <input
              type="checkbox"
              checked={autoReplyEnabled}
              onChange={(e) => setAutoReplyEnabled(e.target.checked)}
            />
            Otomatik yanıt açık
          </label>
          <label className="mail-settings-field">
            <span>Mesaj metni</span>
            <textarea
              className="mail-settings-textarea"
              rows={6}
              maxLength={4000}
              value={autoReplyBodyText}
              onChange={(e) => setAutoReplyBodyText(e.target.value)}
              placeholder="Örn: 15–22 Eylül arasında ofis dışındayım…"
            />
          </label>
          <label className="mail-settings-field">
            <span>Başlangıç (isteğe bağlı)</span>
            <input
              type="datetime-local"
              value={autoReplyActiveFrom}
              onChange={(e) => setAutoReplyActiveFrom(e.target.value)}
            />
          </label>
          <label className="mail-settings-field">
            <span>Bitiş (isteğe bağlı)</span>
            <input
              type="datetime-local"
              value={autoReplyActiveUntil}
              onChange={(e) => setAutoReplyActiveUntil(e.target.value)}
            />
          </label>
          {autoReplyStatus ? <p>{autoReplyStatus}</p> : null}
          <div className="compose-actions">
            <button
              type="button"
              disabled={autoReplySaving}
              onClick={() =>
                void (async () => {
                  if (autoReplyEnabled && !autoReplyBodyText.trim()) {
                    setAutoReplyStatus("Açıkken mesaj metni gerekli.");
                    return;
                  }
                  setAutoReplySaving(true);
                  setAutoReplyStatus("");
                  try {
                    await updateInboxPreferences(accessToken, {
                      autoReplyEnabled,
                      autoReplyBodyText: autoReplyBodyText.trim() || null,
                      autoReplyActiveFrom: fromDatetimeLocalValue(
                        autoReplyActiveFrom,
                      ),
                      autoReplyActiveUntil: fromDatetimeLocalValue(
                        autoReplyActiveUntil,
                      ),
                    });
                    setAutoReplyStatus("Kaydedildi.");
                  } catch (error) {
                    setAutoReplyStatus(
                      error instanceof Error
                        ? error.message
                        : "Kaydedilemedi.",
                    );
                  } finally {
                    setAutoReplySaving(false);
                  }
                })()
              }
            >
              {autoReplySaving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </>,
      );
      break;
    case "notifications":
      content = renderDetail(
        "Bildirimler ve sesler",
        <>
          <p className="mail-settings-lead">
            Yeni gelen posta için tarayıcı bildirimi (Web Push). HTTPS ve izin
            gerekir.
          </p>
          {!pushConfigured ? (
            <p>Sunucuda push henüz yapılandırılmamış (VAPID anahtarları).</p>
          ) : null}
          <div className="mail-settings-callout">
            <strong>iPhone / iPad (Safari)</strong>
            <p>
              Bildirimler tarayıcı <em>sekmede</em> çalışmaz. Paylaş →{" "}
              <strong>Ana Ekrana Ekle</strong>, uygulamayı ana ekrandan açın,
              sonra buradan bildirimleri açın.
            </p>
          </div>
          {pushStatus ? <p>{pushStatus}</p> : null}
          <label className="mail-settings-check">
            <input
              type="checkbox"
              checked={notifySound}
              onChange={(e) => {
                const on = e.target.checked;
                setNotifySound(on);
                setMailNotifySoundEnabled(on);
                if (on) {
                  playMailNotifyBeep();
                }
              }}
            />
            Yeni posta bildiriminde ses (sekme açıkken)
          </label>
          <label className="mail-settings-check">
            <input
              type="checkbox"
              checked={dailyDigest}
              onChange={(e) => {
                const on = e.target.checked;
                setDailyDigest(on);
                void updateInboxPreferences(accessToken, {
                  dailyDigestEnabled: on,
                }).catch(() => {
                  setPushStatus("Özet ayarı kaydedilemedi.");
                  setDailyDigest(!on);
                });
              }}
            />
            Günlük özet e-postası (08:00, okunmamış varsa)
          </label>
          <div className="compose-actions">
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
        </>,
      );
      break;
    case "security":
      content = renderDetail(
        "Güvenlik",
        <>
          <p className="mail-settings-lead">
            İki adımlı doğrulama (TOTP). Kapatmak için yönetim konsolu güvenlik
            sayfasını kullanın.
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
        </>,
      );
      break;
    case "privacy":
      content = renderDetail(
        "Gizlilik",
        <>
          <p className="mail-settings-lead">
            KVKK veri dışa aktarımı ve silme talepleri firma yöneticisi için{" "}
            <strong>Lerta yönetim konsolu</strong> ve kurumsal posta kimlik
            panelinde yönetilir (Faz S-A3: buradan doğrudan bağlantı).
          </p>
        </>,
      );
      break;
    case "rules":
      content = renderDetail(
        "Posta kuralları",
        <MailRulesPanel accessToken={accessToken} />,
      );
      break;
    case "imap":
      content = renderDetail(
        "IMAP ve SMTP",
        <>
          <p className="mail-settings-lead">
            Masaüstü istemci (Thunderbird, Outlook) ile kutunuza bağlanın.{" "}
            <a href="/help/imap" target="_blank" rel="noopener noreferrer">
              Kurulum rehberi
            </a>
          </p>
          {copyHint ? <p style={{ fontSize: "0.85rem" }}>{copyHint}</p> : null}
          {error ? <p className="login-error">{error}</p> : null}
          {settings ? (
            <dl className="imap-dl">
              <dt>Durum</dt>
              <dd>{settings.enabled ? "Aktif" : "Sunucuda kapalı"}</dd>
              <dt>Sunucu</dt>
              <dd>
                {settings.imapHost}:{settings.imapPort}{" "}
                {settings.imapTls ? "(SSL/TLS)" : ""}
                {settings.enabled ? (
                  <button
                    type="button"
                    className="mail-copy-inline"
                    onClick={() =>
                      void copyText(
                        "Sunucu",
                        `${settings.imapHost}:${settings.imapPort}`,
                      )
                    }
                  >
                    Kopyala
                  </button>
                ) : null}
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
                {settings.enabled ? (
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
                ) : null}
                <div className="mail-imap-hint">
                  Kimlik doğrulama: IMAP ile aynı kullanıcı ve şifre.
                </div>
              </dd>
              <dt>Şifre</dt>
              <dd>
                {settings.hasCredential
                  ? "Kayıtlı (güvenlik için gösterilmez)"
                  : "Henüz oluşturulmadı"}
              </dd>
              <dt>Gönderilen (IMAP)</dt>
              <dd className="mail-imap-hint">{settings.sentFolderImapHint}</dd>
            </dl>
          ) : (
            <p>Yükleniyor…</p>
          )}
          {newPassword ? (
            <p className="mail-settings-password-once">
              Yeni şifre (bir kez gösterilir): <strong>{newPassword}</strong>
            </p>
          ) : null}
          <div className="compose-actions">
            <button
              type="button"
              disabled={loading || !settings?.enabled}
              onClick={() => void onRotate()}
            >
              {loading ? "…" : "IMAP şifresi oluştur / yenile"}
            </button>
          </div>
        </>,
      );
      break;
    default:
      content = renderHub();
  }

  return (
    <div className="compose-overlay" role="presentation" onClick={onClose}>
      <div
        className="compose-dialog mail-settings-dialog"
        role="dialog"
        aria-label="Ayarlar"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function settingsRowIcon(id: SettingsView): string {
  switch (id) {
    case "display":
      return "🎨";
    case "signature":
      return "✒️";
    case "autoReply":
      return "↩️";
    case "notifications":
      return "🔔";
    case "imap":
      return "📬";
    case "rules":
      return "⚡";
    case "security":
      return "🔒";
    case "privacy":
      return "🛡️";
    case "help":
      return "❓";
    default:
      return "•";
  }
}
