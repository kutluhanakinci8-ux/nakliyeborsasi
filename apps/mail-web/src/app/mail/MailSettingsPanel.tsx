"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  fetchImapSettings,
  reconcileImapMaildir,
  fetchTotpStatus,
  provisionImapPassword,
  rotateImapPassword,
  type MailImapSettings,
} from "@/lib/mailApi";
import { MailDeliverabilityPanel } from "./MailDeliverabilityPanel";
import { MailOpsSnapshotPanel } from "./MailOpsSnapshotPanel";
import { MailImapClientSetup } from "./MailImapClientSetup";
import { MailComposePresetsPanel } from "./MailComposePresetsPanel";
import { MailAccountsSettingsPanel } from "./MailAccountsSettingsPanel";
import { MailRulesPanel } from "./MailRulesPanel";
import {
  fetchCalendarCalDavAccounts,
  fetchContactCardDavAccounts,
  fetchInboxPreferences,
  fetchMailPushConfig,
  syncAllCalendarCalDavAccounts,
  syncAllContactCardDavAccounts,
  type MailInboxListDensity,
} from "@/lib/mailApi";
import { MailDisplaySettings } from "./MailDisplaySettings";
import { MailPostaSettings } from "./MailPostaSettings";
import { MailAutoReplySettingsPanel } from "./MailAutoReplySettingsPanel";
import { MailNotificationsSettingsPanel } from "./MailNotificationsSettingsPanel";
import { MailHelpPanel } from "./MailHelpPanel";
import { MailPrivacySettingsPanel } from "./MailPrivacySettingsPanel";
import { MailSecuritySettingsPanel } from "./MailSecuritySettingsPanel";
import { MailIntegrationsSettingsPanel } from "./MailIntegrationsSettingsPanel";
import { MailPilotBillingNotice } from "./MailPilotBillingNotice";
import { MailCalendarGooglePanel } from "./MailCalendarGooglePanel";
import { MailCalendarGraphPanel } from "./MailCalendarGraphPanel";
import { fetchWebAuthnCredentials } from "@/lib/mailApi";

export type SettingsView =
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
  | "help"
  | "integrations"
  | "ops";

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
    subtitle: "Tema, yoğunluk, okuma",
    keywords: "tema görünüm dark light yoğunluk konuşma yazı",
  },
  {
    id: "mailPrefs",
    section: "quick",
    label: "Posta",
    subtitle: "Geri al gönder, yanıt, uzak resim",
    keywords: "posta geri al undo yanıt reply uzak resim konuşma",
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
    subtitle: "Thunderbird, Outlook masaüstü ve mobil",
    keywords: "imap smtp thunderbird outlook hesap android ios",
  },
  {
    id: "integrations",
    section: "general",
    label: "Eklentiler ve entegrasyonlar",
    subtitle: "IMAP, CalDAV, CardDAV, API",
    keywords: "entegrasyon imap api webhook outlook mobil caldav carddav",
  },
  {
    id: "deliverability",
    section: "general",
    label: "Teslimat ve itibar",
    subtitle: "SPF, DKIM, bounce özeti",
    keywords: "spf dkim dmarc bounce deliverability",
  },
  {
    id: "ops",
    section: "general",
    label: "Ops snapshot",
    subtitle: "Runbook ve smoke referansları",
    keywords: "ops runbook smoke snapshot imap",
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
    subtitle: "Passkey, TOTP, posta kilidi",
    keywords: "2fa totp güvenlik passkey biyometri face id",
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
    subtitle: "Rehberler ve özellikler",
    keywords: "yardım destek imap rehber kılavuz",
  },
];

type Props = {
  accessToken: string;
  onClose: () => void;
  onOpenCalendar?: () => void;
  onOpenContacts?: () => void;
  onInboxListDensityChange?: (density: MailInboxListDensity) => void;
  threadView?: boolean;
  onThreadViewChange?: (enabled: boolean) => void;
  onMailPostaPreferencesSaved?: (
    prefs: import("@/lib/mailApi").MailInboxPreferences,
  ) => void;
  onAppLockChange?: (enabled: boolean) => void;
  onPasskeysChange?: (hasPasskeys: boolean) => void;
  onInboxBrandingSaved?: (
    branding: import("@/lib/mailApi").MailInboxBranding,
  ) => void;
  initialView?: SettingsView;
  deliverabilityDmarcFocus?: boolean;
  notificationsPwaFocus?: boolean;
  deliverabilityEngagementFocus?: boolean;
  mailOpsRunbookFocus?: boolean;
};

export function MailSettingsPanel({
  accessToken,
  onClose,
  onOpenCalendar,
  onOpenContacts,
  onInboxListDensityChange,
  threadView = false,
  onThreadViewChange,
  onMailPostaPreferencesSaved,
  onAppLockChange,
  onPasskeysChange,
  onInboxBrandingSaved,
  initialView,
  deliverabilityDmarcFocus = false,
  notificationsPwaFocus = false,
  deliverabilityEngagementFocus = false,
  mailOpsRunbookFocus = false,
}: Props) {
  const [view, setView] = useState<SettingsView>(initialView ?? "hub");
  const [query, setQuery] = useState("");
  const [pushConfigured, setPushConfigured] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [inboxListDensity, setInboxListDensity] =
    useState<MailInboxListDensity>("comfortable");
  const [calDavAccounts, setCalDavAccounts] = useState<
    { id: string; label: string; lastSyncedAt: string | null }[]
  >([]);
  const [cardDavAccounts, setCardDavAccounts] = useState<
    { id: string; label: string; lastSyncedAt: string | null }[]
  >([]);
  const [syncStatus, setSyncStatus] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [hasPasskeys, setHasPasskeys] = useState(false);
  const [mailAppLockEnabled, setMailAppLockEnabled] = useState(false);
  const [settings, setSettings] = useState<MailImapSettings | null>(null);
  const [error, setError] = useState("");
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imapReconcileBusy, setImapReconcileBusy] = useState(false);
  const [copyHint, setCopyHint] = useState("");

  useEffect(() => {
    if (initialView) {
      setView(initialView);
    }
  }, [initialView]);

  useEffect(() => {
    void (async () => {
      try {
        setSettings(await fetchImapSettings(accessToken));
        const totp = await fetchTotpStatus(accessToken);
        setTotpEnabled(totp.status.enabled);
        const webauthn = await fetchWebAuthnCredentials(accessToken);
        setHasPasskeys(webauthn.hasPasskeys);
        onPasskeysChange?.(webauthn.hasPasskeys);
        const push = await fetchMailPushConfig(accessToken);
        setPushConfigured(push.config.enabled);
        const prefs = await fetchInboxPreferences(accessToken);
        setAutoReplyEnabled(prefs.preferences.autoReplyEnabled);
        setMailAppLockEnabled(prefs.preferences.mailAppLockEnabled ?? false);
        onAppLockChange?.(prefs.preferences.mailAppLockEnabled ?? false);
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

  async function onReconcileImapMaildir() {
    setError("");
    setImapReconcileBusy(true);
    try {
      const result = await reconcileImapMaildir(accessToken);
      setCopyHint(
        `IMAP senkron: ${result.updatedFolder} klasör, ${result.relocatedPath} dosya güncellendi.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Maildir senkronu başarısız.",
      );
    } finally {
      setImapReconcileBusy(false);
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
        <MailPilotBillingNotice accessToken={accessToken} variant="hub" />
        <div className="mail-settings-scroll">
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
                                ? hasPasskeys
                                  ? mailAppLockEnabled
                                    ? "Passkey + posta kilidi"
                                    : "Passkey kayıtlı"
                                  : totpEnabled
                                    ? "TOTP açık"
                                    : "TOTP / passkey"
                                : item.id === "integrations"
                                  ? settings?.hasCredential
                                    ? "IMAP hazır · CalDAV/CardDAV"
                                    : "IMAP, takvim, kişi, API"
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
        <MailPostaSettings
          accessToken={accessToken}
          threadView={threadView}
          onThreadViewChange={
            onThreadViewChange ??
            (() => {
              /* hub dışı panel */
            })
          }
          onPreferencesSaved={onMailPostaPreferencesSaved}
          onOpenDisplay={() => setView("display")}
        />,
      );
      break;
    case "display":
      content = renderDetail(
        "Ekran ve görünüm",
        <MailDisplaySettings
          accessToken={accessToken}
          inboxListDensity={inboxListDensity}
          onInboxListDensityChange={(density) => {
            setInboxListDensity(density);
            onInboxListDensityChange?.(density);
          }}
        />,
      );
      break;
    case "accounts":
      content = renderDetail(
        "Hesaplar ve gönderenler",
        <MailAccountsSettingsPanel
          accessToken={accessToken}
          onBrandingSaved={onInboxBrandingSaved}
        />,
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
        <MailAutoReplySettingsPanel
          accessToken={accessToken}
          onEnabledChange={setAutoReplyEnabled}
        />,
      );
      break;
    case "notifications":
      content = renderDetail(
        "Bildirimler ve sesler",
        <MailNotificationsSettingsPanel
          accessToken={accessToken}
          notificationsPwaFocus={notificationsPwaFocus}
        />,
      );
      break;
    case "security":
      content = renderDetail(
        "Güvenlik",
        <MailSecuritySettingsPanel
          accessToken={accessToken}
          onTotpEnabledChange={setTotpEnabled}
          onAppLockChange={(enabled) => {
            setMailAppLockEnabled(enabled);
            onAppLockChange?.(enabled);
          }}
          onPasskeysChange={(has) => {
            setHasPasskeys(has);
            onPasskeysChange?.(has);
          }}
        />,
      );
      break;
    case "integrations":
      content = renderDetail(
        "Eklentiler ve entegrasyonlar",
        <MailIntegrationsSettingsPanel
          onOpenImap={() => setView("imap")}
          onOpenCalendarSettings={() => setView("calendarSettings")}
          onOpenContactsSettings={() => setView("contactsSettings")}
          onOpenDeliverability={() => setView("deliverability")}
        />,
      );
      break;
    case "privacy":
      content = renderDetail(
        "Gizlilik",
        <MailPrivacySettingsPanel accessToken={accessToken} />,
      );
      break;
    case "calendarSettings":
      content = renderDetail(
        "Takvim",
        <>
          <p className="mail-settings-lead">
            Google Takvim, Microsoft Graph ve CalDAV. OAuth bağlantıları buradan
            veya tam ekran takvim görünümünden yönetilir.
          </p>
          <div className="mail-settings-calendar-cloud">
            <MailCalendarGooglePanel
              accessToken={accessToken}
              onToast={setSyncStatus}
              onSynced={() => {}}
            />
            <MailCalendarGraphPanel
              accessToken={accessToken}
              onToast={setSyncStatus}
              onSynced={() => {}}
            />
          </div>
          <p className="mail-settings-lead">
            CalDAV hesapları ve ICS beslemeleri tam ekran takvimde de
            düzenlenebilir.
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
    case "ops":
      content = renderDetail(
        "Ops snapshot ve runbook",
        <MailOpsSnapshotPanel
          accessToken={accessToken}
          highlightRunbook={mailOpsRunbookFocus}
        />,
      );
      break;
    case "deliverability":
      content = renderDetail(
        "Teslimat ve itibar",
        <MailDeliverabilityPanel
          accessToken={accessToken}
          highlightDmarc={deliverabilityDmarcFocus}
          highlightEngagement={deliverabilityEngagementFocus}
        />,
      );
      break;
    case "rules":
      content = renderDetail(
        "Posta kuralları",
        <MailRulesPanel accessToken={accessToken} />,
      );
      break;
    case "help":
      content = renderDetail(
        "Yardım",
        <MailHelpPanel
          onOpenSetting={setView}
          onOpenCalendar={onOpenCalendar}
          onOpenContacts={onOpenContacts}
        />,
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
          onReconcileMaildir={() => void onReconcileImapMaildir()}
          reconcileBusy={imapReconcileBusy}
        />,
      );
      break;
    default:
      content = renderHub();
  }

  return (
    <div className="compose-overlay" role="presentation" onClick={onClose}>
      <div
        className={
          view === "mailPrefs" ||
          view === "accounts" ||
          view === "signature" ||
          view === "autoReply" ||
          view === "notifications" ||
          view === "imap" ||
          view === "deliverability" ||
          view === "ops" ||
          view === "rules" ||
          view === "help" ||
          view === "privacy" ||
          view === "security"
            ? "compose-dialog mail-settings-dialog mail-settings-dialog--wide"
            : "compose-dialog mail-settings-dialog"
        }
        role="dialog"
        aria-label="Ayarlar"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
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
    case "ops":
      return "📋";
    case "deliverability":
      return "📈";
    default:
      return "•";
  }
}
