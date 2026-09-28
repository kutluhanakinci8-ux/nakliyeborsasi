"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  beginTotpSetup,
  confirmTotpSetup,
  fetchAiMailConsent,
  fetchImapSettings,
  fetchTotpStatus,
  patchAiMailConsent,
  provisionImapPassword,
  rotateImapPassword,
  type MailImapSettings,
} from "@/lib/mailApi";
import { MailDeliverabilityPanel } from "./MailDeliverabilityPanel";
import { MailImapClientSetup } from "./MailImapClientSetup";
import { MailComposePresetsPanel } from "./MailComposePresetsPanel";
import { MailAccountsSettingsPanel } from "./MailAccountsSettingsPanel";
import { MailRulesPanel } from "./MailRulesPanel";
import {
  downloadMailPrivacyExport,
  fetchCalendarCalDavAccounts,
  fetchContactCardDavAccounts,
  fetchInboxPreferences,
  fetchMailPushConfig,
  resolveMailConsoleUrl,
  syncAllCalendarCalDavAccounts,
  syncAllContactCardDavAccounts,
  updateInboxPreferences,
  type MailInboxListDensity,
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
  | "accounts"
  | "display"
  | "mailPrefs"
  | "signature"
  | "autoReply"
  | "notifications"
  | "imap"
  | "rules"
  | "security"
  | "privacy"
  | "deliverability"
  | "calendarSettings"
  | "contactsSettings"
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
    id: "mailPrefs",
    section: "quick",
    label: "Posta",
    subtitle: "Gelen kutusu liste yoğunluğu",
    keywords: "posta liste yoğunluk sıkı rahat compact",
  },
  {
    id: "accounts",
    section: "quick",
    label: "Hesaplar ve gönderenler",
    subtitle: "Kimlik, alias, varsayılan From",
    keywords: "hesap gönderen alias kimlik from",
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
    id: "deliverability",
    section: "general",
    label: "Teslimat ve itibar",
    subtitle: "SPF, DKIM, bounce özeti",
    keywords: "spf dkim dmarc bounce deliverability",
  },
  {
    id: "rules",
    section: "general",
    label: "Posta kuralları",
    subtitle: "Gelen kutusu otomasyonu",
    keywords: "kural filtre yönlendir",
  },
  {
    id: "calendarSettings",
    section: "general",
    label: "Takvim",
    subtitle: "CalDAV hesapları ve senkron",
    keywords: "takvim caldav ics senkron",
  },
  {
    id: "contactsSettings",
    section: "general",
    label: "Kişiler",
    subtitle: "CardDAV hesapları ve senkron",
    keywords: "kişi rehber carddav senkron",
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
  onInboxListDensityChange?: (density: MailInboxListDensity) => void;
};

export function MailSettingsPanel({
  accessToken,
  onClose,
  onOpenCalendar,
  onOpenContacts,
  onInboxListDensityChange,
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
  const [inboxListDensity, setInboxListDensity] =
    useState<MailInboxListDensity>("comfortable");
  const [mailPrefsStatus, setMailPrefsStatus] = useState("");
  const [mailPrefsSaving, setMailPrefsSaving] = useState(false);
  const [privacyStatus, setPrivacyStatus] = useState("");
  const [privacyExporting, setPrivacyExporting] = useState(false);
  const [aiMailConsent, setAiMailConsent] = useState(false);
  const [aiConsentBusy, setAiConsentBusy] = useState(false);
  const [calDavAccounts, setCalDavAccounts] = useState<
    { id: string; label: string; lastSyncedAt: string | null }[]
  >([]);
  const [cardDavAccounts, setCardDavAccounts] = useState<
    { id: string; label: string; lastSyncedAt: string | null }[]
  >([]);
  const [syncStatus, setSyncStatus] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
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
        const density = prefs.preferences.inboxListDensity ?? "comfortable";
        setInboxListDensity(density);
        onInboxListDensityChange?.(density);
      } catch {
        setError("Ayarlar yüklenemedi.");
      }
    })();
  }, [accessToken, onInboxListDensityChange]);

  useEffect(() => {
    if (view !== "calendarSettings" && view !== "contactsSettings") {
      return;
    }
    void (async () => {
      try {
        if (view === "calendarSettings") {
          const { accounts } = await fetchCalendarCalDavAccounts(accessToken);
          setCalDavAccounts(
            accounts.map((a) => ({
              id: a.id,
              label: a.label || a.calendarUrl || a.id,
              lastSyncedAt: a.lastSyncedAt,
            })),
          );
        } else {
          const { accounts } = await fetchContactCardDavAccounts(accessToken);
          setCardDavAccounts(
            accounts.map((a) => ({
              id: a.id,
              label: a.label || a.addressbookUrl || a.id,
              lastSyncedAt: a.lastSyncedAt,
            })),
          );
        }
      } catch {
        setSyncStatus("Hesaplar yüklenemedi.");
      }
    })();
  }, [accessToken, view]);

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

  async function onProvisionImap() {
    setError("");
    setNewPassword(null);
    setLoading(true);
    try {
      const creds = await provisionImapPassword(accessToken);
      setNewPassword(creds.password);
      setSettings(await fetchImapSettings(accessToken));
      setCopyHint("IMAP şifresi oluşturuldu — kopyalayın.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Şifre oluşturulamadı (firma sahibi veya posta yöneticisi gerekli).",
      );
    } finally {
      setLoading(false);
    }
  }

  async function onRotateImap() {
    setError("");
    setNewPassword(null);
    setLoading(true);
    try {
      const creds = await rotateImapPassword(accessToken);
      setNewPassword(creds.password);
      setSettings(await fetchImapSettings(accessToken));
      setCopyHint("Yeni IMAP şifresi — eski istemcilerde güncelleyin.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Şifre yenilenemedi (firma sahibi veya posta yöneticisi gerekli).",
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
                                  : item.id === "mailPrefs"
                                    ? inboxListDensity === "compact"
                                      ? "Sıkı liste"
                                      : "Rahat liste"
                                    : item.id === "imap" &&
                                        settings?.enabled &&
                                        (settings.needsImapClientPassword ||
                                          !settings.hasCredential)
                                      ? "İlk kurulum: şifre oluşturun"
                                      : item.id === "imap" &&
                                          settings?.hasCredential
                                        ? "Thunderbird / Outlook hazır"
                                        : item.subtitle}
                          </small>
                          {item.id === "imap" &&
                          settings?.enabled &&
                          (settings.needsImapClientPassword ||
                            !settings.hasCredential) ? (
                            <span className="mail-settings-row-badge">!</span>
                          ) : null}
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
    case "mailPrefs":
      content = renderDetail(
        "Posta",
        <>
          <p className="mail-settings-lead">
            Gelen kutusu satır aralığı (Outlook «Posta» yoğunluğu). Tercih
            kurumsal posta kutusu için sunucuda saklanır.
          </p>
          <div className="mail-settings-theme-options">
            {(
              [
                { id: "comfortable" as MailInboxListDensity, label: "Rahat" },
                { id: "compact" as MailInboxListDensity, label: "Sıkı" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                className={
                  inboxListDensity === option.id
                    ? "mail-settings-theme-btn active"
                    : "mail-settings-theme-btn"
                }
                onClick={() => setInboxListDensity(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {mailPrefsStatus ? <p>{mailPrefsStatus}</p> : null}
          <div className="compose-actions">
            <button
              type="button"
              disabled={mailPrefsSaving}
              onClick={() =>
                void (async () => {
                  setMailPrefsSaving(true);
                  setMailPrefsStatus("");
                  try {
                    const result = await updateInboxPreferences(accessToken, {
                      inboxListDensity,
                    });
                    const saved = result.preferences.inboxListDensity;
                    setInboxListDensity(saved);
                    onInboxListDensityChange?.(saved);
                    setMailPrefsStatus("Kaydedildi.");
                  } catch (error) {
                    setMailPrefsStatus(
                      error instanceof Error
                        ? error.message
                        : "Kaydedilemedi.",
                    );
                  } finally {
                    setMailPrefsSaving(false);
                  }
                })()
              }
            >
              {mailPrefsSaving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </>,
      );
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
    case "accounts":
      content = renderDetail(
        "Hesaplar ve gönderenler",
        <MailAccountsSettingsPanel accessToken={accessToken} />,
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
            KVKK kapsamında kurumsal posta kimliği verilerinizi indirin. Silme
            talebi ve durum takibi firma yöneticisi için yönetim konsolunda
            yapılır.
          </p>
          <label className="mail-settings-toggle">
            <input
              type="checkbox"
              checked={aiMailConsent}
              disabled={aiConsentBusy}
              onChange={(e) => {
                const next = e.target.checked;
                setAiConsentBusy(true);
                void patchAiMailConsent(accessToken, next)
                  .then(() => {
                    setAiMailConsent(next);
                  })
                  .finally(() => setAiConsentBusy(false));
              }}
              onFocus={() => {
                if (!aiMailConsent && !aiConsentBusy) {
                  void fetchAiMailConsent(accessToken)
                    .then((p) => setAiMailConsent(p.aiMailAssistConsent))
                    .catch(() => undefined);
                }
              }}
            />
            AI posta asistanı (yanıt önerisi, özet, sınıflandırma) — KVKK onayı
          </label>
          {privacyStatus ? <p>{privacyStatus}</p> : null}
          <div className="compose-actions">
            <button
              type="button"
              disabled={privacyExporting}
              onClick={() =>
                void (async () => {
                  setPrivacyExporting(true);
                  setPrivacyStatus("");
                  try {
                    const { blob, filename } =
                      await downloadMailPrivacyExport(accessToken);
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement("a");
                    anchor.href = url;
                    anchor.download = filename;
                    anchor.click();
                    URL.revokeObjectURL(url);
                    setPrivacyStatus("JSON indirildi.");
                  } catch (error) {
                    setPrivacyStatus(
                      error instanceof Error
                        ? error.message
                        : "Dışa aktarım başarısız.",
                    );
                  } finally {
                    setPrivacyExporting(false);
                  }
                })()
              }
            >
              {privacyExporting ? "Hazırlanıyor…" : "Verilerimi indir (JSON)"}
            </button>
          </div>
          <p className="mail-settings-lead" style={{ marginTop: 16 }}>
            <a
              href={resolveMailConsoleUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Lerta yönetim konsolu
            </a>
            — silme talebi, DNS ve posta kimliği ayarları.
          </p>
        </>,
      );
      break;
    case "calendarSettings":
      content = renderDetail(
        "Takvim",
        <>
          <p className="mail-settings-lead">
            Harici CalDAV hesapları. Hesap ekleme ve ICS beslemeleri tam ekran
            takvim görünümünde yapılır.
          </p>
          {syncStatus ? <p>{syncStatus}</p> : null}
          {calDavAccounts.length === 0 ? (
            <p>Henüz CalDAV hesabı yok.</p>
          ) : (
            <ul className="mail-settings-sync-list">
              {calDavAccounts.map((account) => (
                <li key={account.id}>
                  <strong>{account.label}</strong>
                  <small>
                    {account.lastSyncedAt
                      ? `Son senkron: ${new Date(account.lastSyncedAt).toLocaleString("tr-TR")}`
                      : "Henüz senkronlanmadı"}
                  </small>
                </li>
              ))}
            </ul>
          )}
          <div className="compose-actions">
            {onOpenCalendar ? (
              <button
                type="button"
                onClick={() => {
                  onOpenCalendar();
                  onClose();
                }}
              >
                Takvimi aç
              </button>
            ) : null}
            <button
              type="button"
              disabled={syncBusy || calDavAccounts.length === 0}
              onClick={() =>
                void (async () => {
                  setSyncBusy(true);
                  setSyncStatus("");
                  try {
                    const result =
                      await syncAllCalendarCalDavAccounts(accessToken);
                    setSyncStatus(
                      `Senkron: ${result.succeeded}/${result.accounts} hesap · +${result.imported} / ~${result.updated} etkinlik.`,
                    );
                    const { accounts } =
                      await fetchCalendarCalDavAccounts(accessToken);
                    setCalDavAccounts(
                      accounts.map((a) => ({
                        id: a.id,
                        label: a.label || a.calendarUrl || a.id,
                        lastSyncedAt: a.lastSyncedAt,
                      })),
                    );
                  } catch (error) {
                    setSyncStatus(
                      error instanceof Error
                        ? error.message
                        : "Senkron başarısız.",
                    );
                  } finally {
                    setSyncBusy(false);
                  }
                })()
              }
            >
              {syncBusy ? "Senkron…" : "Tümünü senkronla"}
            </button>
          </div>
        </>,
      );
      break;
    case "contactsSettings":
      content = renderDetail(
        "Kişiler",
        <>
          <p className="mail-settings-lead">
            Harici CardDAV rehberleri. Yeni hesap ekleme tam ekran kişiler
            görünümünde yapılır.
          </p>
          {syncStatus ? <p>{syncStatus}</p> : null}
          {cardDavAccounts.length === 0 ? (
            <p>Henüz CardDAV hesabı yok.</p>
          ) : (
            <ul className="mail-settings-sync-list">
              {cardDavAccounts.map((account) => (
                <li key={account.id}>
                  <strong>{account.label}</strong>
                  <small>
                    {account.lastSyncedAt
                      ? `Son senkron: ${new Date(account.lastSyncedAt).toLocaleString("tr-TR")}`
                      : "Henüz senkronlanmadı"}
                  </small>
                </li>
              ))}
            </ul>
          )}
          <div className="compose-actions">
            {onOpenContacts ? (
              <button
                type="button"
                onClick={() => {
                  onOpenContacts();
                  onClose();
                }}
              >
                Kişileri aç
              </button>
            ) : null}
            <button
              type="button"
              disabled={syncBusy || cardDavAccounts.length === 0}
              onClick={() =>
                void (async () => {
                  setSyncBusy(true);
                  setSyncStatus("");
                  try {
                    const result =
                      await syncAllContactCardDavAccounts(accessToken);
                    setSyncStatus(
                      `Senkron: ${result.succeeded}/${result.accounts} hesap · +${result.imported} / ~${result.updated} kişi.`,
                    );
                    const { accounts } =
                      await fetchContactCardDavAccounts(accessToken);
                    setCardDavAccounts(
                      accounts.map((a) => ({
                        id: a.id,
                        label: a.label || a.addressbookUrl || a.id,
                        lastSyncedAt: a.lastSyncedAt,
                      })),
                    );
                  } catch (error) {
                    setSyncStatus(
                      error instanceof Error
                        ? error.message
                        : "Senkron başarısız.",
                    );
                  } finally {
                    setSyncBusy(false);
                  }
                })()
              }
            >
              {syncBusy ? "Senkron…" : "Tümünü senkronla"}
            </button>
          </div>
        </>,
      );
      break;
    case "deliverability":
      content = renderDetail(
        "Teslimat ve itibar",
        <MailDeliverabilityPanel accessToken={accessToken} />,
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
        <MailImapClientSetup
          settings={settings}
          newPassword={newPassword}
          loading={loading}
          error={error}
          copyHint={copyHint}
          onCopyHint={setCopyHint}
          onProvision={() => void onProvisionImap()}
          onRotate={() => void onRotateImap()}
        />,
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
    case "mailPrefs":
      return "📨";
    case "accounts":
      return "👤";
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
    case "calendarSettings":
      return "📅";
    case "contactsSettings":
      return "👥";
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
