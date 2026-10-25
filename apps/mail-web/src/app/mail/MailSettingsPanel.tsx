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
import { useMailLocale } from "@/lib/MailLocaleProvider";

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

type HubItemDef = {
  id: SettingsView;
  section: HubItem["section"];
  labelKey: string;
  subtitleKey: string;
  keywords: string;
  keywordsEn: string;
  disabled?: boolean;
};

const HUB_ITEM_DEFS: HubItemDef[] = [
  {
    id: "display",
    section: "quick",
    labelKey: "settingsHubDisplay",
    subtitleKey: "settingsHubDisplaySub",
    keywords: "tema görünüm dark light yoğunluk konuşma yazı",
    keywordsEn: "theme display dark light density conversation reading",
  },
  {
    id: "mailPrefs",
    section: "quick",
    labelKey: "settingsHubMailPrefs",
    subtitleKey: "settingsHubMailPrefsSub",
    keywords: "posta geri al undo yanıt reply uzak resim konuşma",
    keywordsEn: "mail undo send reply remote images conversation thread",
  },
  {
    id: "accounts",
    section: "quick",
    labelKey: "settingsHubAccounts",
    subtitleKey: "settingsHubAccountsSub",
    keywords: "hesap gönderen alias kimlik from",
    keywordsEn: "account sender alias identity from",
  },
  {
    id: "signature",
    section: "quick",
    labelKey: "settingsHubSignature",
    subtitleKey: "settingsHubSignatureSub",
    keywords: "imza şablon compose",
    keywordsEn: "signature template compose",
  },
  {
    id: "autoReply",
    section: "quick",
    labelKey: "settingsHubAutoReply",
    subtitleKey: "settingsHubAutoReplySub",
    keywords: "tatil toplantı oof vacation",
    keywordsEn: "vacation meeting oof out of office autoreply",
  },
  {
    id: "notifications",
    section: "quick",
    labelKey: "settingsHubNotifications",
    subtitleKey: "settingsHubNotificationsSub",
    keywords: "bildirim push ses digest",
    keywordsEn: "notification push sound digest",
  },
  {
    id: "imap",
    section: "general",
    labelKey: "settingsHubImap",
    subtitleKey: "settingsHubImapSub",
    keywords: "imap smtp thunderbird outlook hesap android ios",
    keywordsEn: "imap smtp thunderbird outlook account android ios",
  },
  {
    id: "integrations",
    section: "general",
    labelKey: "settingsHubIntegrations",
    subtitleKey: "settingsHubIntegrationsSub",
    keywords: "entegrasyon imap api webhook outlook mobil caldav carddav",
    keywordsEn: "integration imap api webhook outlook mobile caldav carddav",
  },
  {
    id: "deliverability",
    section: "general",
    labelKey: "settingsHubDeliverability",
    subtitleKey: "settingsHubDeliverabilitySub",
    keywords: "spf dkim dmarc bounce deliverability",
    keywordsEn: "spf dkim dmarc bounce deliverability engagement",
  },
  {
    id: "ops",
    section: "general",
    labelKey: "settingsHubOps",
    subtitleKey: "settingsHubOpsSub",
    keywords: "ops runbook smoke snapshot imap",
    keywordsEn: "ops runbook smoke snapshot imap health",
  },
  {
    id: "rules",
    section: "general",
    labelKey: "settingsHubRules",
    subtitleKey: "settingsHubRulesSub",
    keywords: "kural filtre yönlendir",
    keywordsEn: "rule filter forward redirect",
  },
  {
    id: "calendarSettings",
    section: "general",
    labelKey: "settingsHubCalendar",
    subtitleKey: "settingsHubCalendarSub",
    keywords: "takvim caldav ics senkron",
    keywordsEn: "calendar caldav ics sync",
  },
  {
    id: "contactsSettings",
    section: "general",
    labelKey: "settingsHubContacts",
    subtitleKey: "settingsHubContactsSub",
    keywords: "kişi rehber carddav senkron",
    keywordsEn: "contacts address book carddav sync",
  },
  {
    id: "security",
    section: "general",
    labelKey: "settingsHubSecurity",
    subtitleKey: "settingsHubSecuritySub",
    keywords: "2fa totp güvenlik passkey biyometri face id",
    keywordsEn: "2fa totp security passkey biometric face id",
  },
  {
    id: "privacy",
    section: "general",
    labelKey: "settingsHubPrivacy",
    subtitleKey: "settingsHubPrivacySub",
    keywords: "kvkk gizlilik veri",
    keywordsEn: "gdpr privacy data kvkk",
  },
  {
    id: "help",
    section: "other",
    labelKey: "settingsHubHelp",
    subtitleKey: "settingsHubHelpSub",
    keywords: "yardım destek imap rehber kılavuz",
    keywordsEn: "help support imap guide documentation",
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
  const { t } = useMailLocale();
  const hubItems = useMemo<HubItem[]>(
    () =>
      HUB_ITEM_DEFS.map((item) => ({
        id: item.id,
        section: item.section,
        keywords: `${item.keywords} ${item.keywordsEn}`,
        disabled: item.disabled,
        label: t(item.labelKey),
        subtitle: t(item.subtitleKey),
      })),
    [t],
  );
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
        setError(t("settingsLoadError"));
      }
    })();
  }, [accessToken, onInboxListDensityChange, onAppLockChange, onPasskeysChange, t]);

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
        setSyncStatus(t("settingsErrAccountsLoad"));
      }
    })();
  }, [accessToken, view, t]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return hubItems;
    }
    return hubItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.keywords.includes(q),
    );
  }, [query, hubItems]);

  const hubSections: { key: HubItem["section"]; title: string }[] = [
    { key: "quick", title: t("settingsSectionQuick") },
    { key: "general", title: t("settingsSectionGeneral") },
    { key: "other", title: t("settingsSectionOther") },
  ];

  async function onProvisionImap() {
    setError("");
    setNewPassword(null);
    setLoading(true);
    try {
      const creds = await provisionImapPassword(accessToken);
      setNewPassword(creds.password);
      setSettings(await fetchImapSettings(accessToken));
      setCopyHint(t("settingsImapPasswordCreated"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("settingsErrImapProvision"),
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
        t("settingsImapReconcileResult", {
          folders: result.updatedFolder,
          files: result.relocatedPath,
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("settingsErrImapReconcile"),
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
      setCopyHint(t("settingsImapPasswordRotated"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("settingsErrImapRotate"),
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyHint(t("settingsCopied", { label }));
      window.setTimeout(() => setCopyHint(""), 2500);
    } catch {
      setCopyHint(t("settingsCopyFailed"));
    }
  }

  function openHubItem(item: HubItem) {
    if (item.disabled) {
      return;
    }
    setView(item.id);
  }

  function detailTitle(id: SettingsView): string {
    const def = HUB_ITEM_DEFS.find((item) => item.id === id);
    return def ? t(def.labelKey) : t("settingsTitle");
  }

  function renderHub() {
    return (
      <>
        <div className="mail-settings-header mail-settings-header--hub">
          <button
            type="button"
            className="mail-settings-close"
            onClick={onClose}
            aria-label={t("actionClose")}
          >
            ×
          </button>
          <h2 className="mail-settings-title">{t("settingsTitle")}</h2>
        </div>
        <input
          className="mail-settings-search"
          type="search"
          placeholder={t("settingsSearchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("settingsSearchAria")}
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
                              ? t("settingsHubPushConfigured")
                              : item.id === "security"
                                ? hasPasskeys
                                  ? mailAppLockEnabled
                                    ? t("settingsHubPasskeyLock")
                                    : t("settingsHubPasskeyOnly")
                                  : totpEnabled
                                    ? t("settingsHubTotpOn")
                                    : t("settingsHubTotpPasskey")
                                : item.id === "integrations"
                                  ? settings?.hasCredential
                                    ? t("settingsHubIntegrationsReady")
                                    : t("settingsHubIntegrationsDefault")
                                  : item.id === "autoReply"
                                    ? autoReplyEnabled
                                      ? t("settingsHubAutoReplyOn")
                                      : t("settingsHubAutoReplyOff")
                                    : item.id === "mailPrefs"
                                      ? inboxListDensity === "compact"
                                        ? t("settingsHubListCompact")
                                        : t("settingsHubListComfortable")
                                      : item.id === "imap" &&
                                          settings?.enabled &&
                                          (settings.needsImapClientPassword ||
                                            !settings.hasCredential)
                                        ? t("settingsHubImapSetup")
                                        : item.id === "imap" &&
                                            settings?.hasCredential
                                          ? t("settingsHubImapReady")
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
            <p className="mail-settings-empty">{t("settingsEmpty")}</p>
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
            aria-label={t("actionBack")}
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
        detailTitle("mailPrefs"),
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
        detailTitle("display"),
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
        detailTitle("accounts"),
        <MailAccountsSettingsPanel
          accessToken={accessToken}
          onBrandingSaved={onInboxBrandingSaved}
        />,
      );
      break;
    case "signature":
      content = renderDetail(
        detailTitle("signature"),
        <MailComposePresetsPanel accessToken={accessToken} />,
      );
      break;
    case "autoReply":
      content = renderDetail(
        detailTitle("autoReply"),
        <MailAutoReplySettingsPanel
          accessToken={accessToken}
          onEnabledChange={setAutoReplyEnabled}
        />,
      );
      break;
    case "notifications":
      content = renderDetail(
        detailTitle("notifications"),
        <MailNotificationsSettingsPanel
          accessToken={accessToken}
          notificationsPwaFocus={notificationsPwaFocus}
        />,
      );
      break;
    case "security":
      content = renderDetail(
        detailTitle("security"),
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
        detailTitle("integrations"),
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
        detailTitle("privacy"),
        <MailPrivacySettingsPanel accessToken={accessToken} />,
      );
      break;
    case "calendarSettings":
      content = renderDetail(
        detailTitle("calendarSettings"),
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
          <p className="mail-settings-lead">{t("settingsCalDavLead")}</p>
          {syncStatus ? <p>{syncStatus}</p> : null}
          {calDavAccounts.length === 0 ? (
            <p>{t("settingsCalDavEmpty")}</p>
          ) : (
            <ul className="mail-settings-sync-list">
              {calDavAccounts.map((account) => (
                <li key={account.id}>
                  <strong>{account.label}</strong>
                  <small>
                    {account.lastSyncedAt
                      ? t("settingsLastSync", {
                          date: new Date(account.lastSyncedAt).toLocaleString(
                            "tr-TR",
                          ),
                        })
                      : t("settingsNotSyncedYet")}
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
                {t("settingsOpenCalendar")}
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
                      t("settingsSyncResultCal", {
                        succeeded: result.succeeded,
                        accounts: result.accounts,
                        imported: result.imported,
                        updated: result.updated,
                      }),
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
                        : t("settingsSyncFailed"),
                    );
                  } finally {
                    setSyncBusy(false);
                  }
                })()
              }
            >
              {syncBusy ? t("settingsSyncBusy") : t("settingsSyncAll")}
            </button>
          </div>
        </>,
      );
      break;
    case "contactsSettings":
      content = renderDetail(
        detailTitle("contactsSettings"),
        <>
          <p className="mail-settings-lead">{t("settingsCardDavLead")}</p>
          {syncStatus ? <p>{syncStatus}</p> : null}
          {cardDavAccounts.length === 0 ? (
            <p>{t("settingsCardDavEmpty")}</p>
          ) : (
            <ul className="mail-settings-sync-list">
              {cardDavAccounts.map((account) => (
                <li key={account.id}>
                  <strong>{account.label}</strong>
                  <small>
                    {account.lastSyncedAt
                      ? t("settingsLastSync", {
                          date: new Date(account.lastSyncedAt).toLocaleString(
                            "tr-TR",
                          ),
                        })
                      : t("settingsNotSyncedYet")}
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
                {t("settingsOpenContacts")}
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
                      t("settingsSyncResultContacts", {
                        succeeded: result.succeeded,
                        accounts: result.accounts,
                        imported: result.imported,
                        updated: result.updated,
                      }),
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
                        : t("settingsSyncFailed"),
                    );
                  } finally {
                    setSyncBusy(false);
                  }
                })()
              }
            >
              {syncBusy ? t("settingsSyncBusy") : t("settingsSyncAll")}
            </button>
          </div>
        </>,
      );
      break;
    case "ops":
      content = renderDetail(
        detailTitle("ops"),
        <MailOpsSnapshotPanel
          accessToken={accessToken}
          highlightRunbook={mailOpsRunbookFocus}
        />,
      );
      break;
    case "deliverability":
      content = renderDetail(
        detailTitle("deliverability"),
        <MailDeliverabilityPanel
          accessToken={accessToken}
          highlightDmarc={deliverabilityDmarcFocus}
          highlightEngagement={deliverabilityEngagementFocus}
        />,
      );
      break;
    case "rules":
      content = renderDetail(
        detailTitle("rules"),
        <MailRulesPanel accessToken={accessToken} />,
      );
      break;
    case "help":
      content = renderDetail(
        detailTitle("help"),
        <MailHelpPanel
          onOpenSetting={setView}
          onOpenCalendar={onOpenCalendar}
          onOpenContacts={onOpenContacts}
        />,
      );
      break;
    case "imap":
      content = renderDetail(
        detailTitle("imap"),
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
        aria-label={t("settingsAria")}
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
