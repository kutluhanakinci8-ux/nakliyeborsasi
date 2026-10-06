"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { SocialHubOpsLogRail } from "./SocialHubOpsLogRail";
import {
  buildConnectionsOpsLog,
  connectionUserSummary,
} from "../../lib/socialHubConnectionsOpsLog";
import {
  buildHealthOpsLog,
  healthChannelUserSummary,
  healthTokenBadgeLabel,
} from "../../lib/socialHubHealthOpsLog";
import {
  buildInboxOpsLog,
  inboxPanelLead,
  inboxPlatformSummary,
} from "../../lib/socialHubInboxOpsLog";
import {
  buildPublishingOpsLog,
  postStatusBadgeClass,
  postUserSummary,
  publishingPanelLead,
} from "../../lib/socialHubPublishingOpsLog";
import {
  buildTemplatesOpsLog,
  templateCardSummary,
  templatesPanelLead,
} from "../../lib/socialHubTemplatesOpsLog";
import {
  buildTeamOpsLog,
  memberCardSummary,
  teamPanelLead,
} from "../../lib/socialHubTeamOpsLog";
import type {
  SocialHubAuditEntry,
  SocialHubPermissions,
  SocialHubPost,
  SocialHubSettings,
  SocialHubAnalytics,
  SocialHubHealth,
  SocialHubNotificationInsights,
  SocialHubOutboundDelivery,
  SocialHubSnapshot,
  SocialHubRoadmapProvider,
  SocialHubTeamMember,
  SocialHubTemplate,
  SocialHubInboxThreadPreview,
  SocialHubPwaConfig,
  SocialHubIntegrationGateStep,
} from "../../lib/socialHubTypes";
import {
  buildMonthGrid,
  buildWeekGrid,
  monthLabelTr,
  toDateKey,
} from "../../lib/socialHubCalendar";
import {
  renderSocialHubTemplatePreview,
  SOCIAL_HUB_TEMPLATE_VARIABLE_HINTS,
} from "../../lib/socialHubTemplateRender";

const ROADMAP_CONNECTION_PLATFORM_CODES = new Set([
  "TIKTOK",
  "YOUTUBE",
  "X",
]);

const TEMPLATE_CHANNEL_SCOPE_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "", label: "Tüm kanallar" },
  { code: "INSTAGRAM", label: "Instagram" },
  { code: "FACEBOOK_MESSENGER", label: "Facebook Messenger" },
  { code: "WHATSAPP_CLOUD", label: "WhatsApp Business" },
  { code: "LINKEDIN", label: "LinkedIn" },
  { code: "TELEGRAM", label: "Telegram" },
  { code: "TIKTOK", label: "TikTok" },
  { code: "YOUTUBE", label: "YouTube" },
];

function capabilitySummary(
  caps: SocialHubSnapshot["providers"][number]["capabilities"],
): string[] {
  if (!caps) {
    return [];
  }
  const items: string[] = [];
  if (caps.inboxWebhook) {
    items.push("Gelen webhook");
  }
  if (caps.outboundMessaging) {
    items.push("Giden mesaj");
  }
  if (caps.feedPublish) {
    items.push("Feed yayını");
  }
  if (caps.inboxHistorySync) {
    items.push("Geçmiş sync");
  }
  return items;
}

function statusLabel(code: string): string {
  const map: Record<string, string> = {
    DISCONNECTED: "Bağlı değil",
    PENDING_OAUTH: "OAuth bekleniyor",
    CONNECTED: "Bağlı",
    ERROR: "Hata",
    TOKEN_EXPIRED: "Token süresi doldu",
  };
  return map[code] ?? code;
}

function connectionStatusBadgeClass(code: string): string {
  switch (code) {
    case "CONNECTED":
      return "social-hub-status-badge social-hub-status-badge--ok";
    case "ERROR":
    case "TOKEN_EXPIRED":
      return "social-hub-status-badge social-hub-status-badge--error";
    case "PENDING_OAUTH":
      return "social-hub-status-badge social-hub-status-badge--pending";
    default:
      return "social-hub-status-badge social-hub-status-badge--muted";
  }
}

function roadmapPrimaryPill(row: SocialHubRoadmapProvider): {
  label: string;
  className: string;
} {
  if (row.isPendingSkeleton || row.implementationStatus === "pending") {
    return {
      label: "Pending iskelet",
      className: "social-hub-pill social-hub-pill--muted",
    };
  }
  if (
    row.isRoadmapBeta === false &&
    row.roadmapConnectionStatusCode === "CONNECTED"
  ) {
    return { label: "Bağlı", className: "social-hub-pill social-hub-pill--ok" };
  }
  if (
    row.isRoadmapBeta === false &&
    (row.oauthImplementationStatus === "ready" ||
      row.implementationStatus === "ready")
  ) {
    return { label: "Prod kanal", className: "social-hub-pill social-hub-pill--ok" };
  }
  return { label: "Yakında", className: "social-hub-pill" };
}

function roadmapConnectLabel(row: SocialHubRoadmapProvider): string {
  if (row.isRoadmapBeta === false) {
    return `${row.label} bağla`;
  }
  return `${row.label} bağla (beta)`;
}

function postStatusLabel(code: string): string {
  const map: Record<string, string> = {
    DRAFT: "Taslak",
    PENDING_APPROVAL: "Onay bekliyor",
    APPROVED: "Onaylandı",
    SCHEDULED: "Zamanlandı",
    PUBLISHING: "Yayınlanıyor",
    PUBLISHED: "Yayınlandı",
    FAILED: "Başarısız",
    CANCELLED: "İptal",
  };
  return map[code] ?? code;
}

function formatSchedule(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type ConnectionsProps = {
  snapshot: SocialHubSnapshot;
  busy: boolean;
  onConnect: (platformCode: string) => void;
  onDisconnect: (platformCode: string) => void;
  onRoadmapInterest?: (platformCode: string, interested: boolean) => void;
  onRoadmapConnect?: (platformCode: string) => void;
  onRoadmapDisconnect?: (platformCode: string) => void;
  onRoadmapRefreshToken?: (platformCode: string) => void;
  onTelegramChannelSetup?: () => void;
  onTelegramDiscussionSetup?: () => void;
  integrationGateExpanded?: boolean;
  highlightPlatformCode?: string | null;
};

function integrationGateStepLabel(
  status: SocialHubIntegrationGateStep["status"],
): string {
  switch (status) {
    case "ready":
      return "Hazır";
    case "partial":
      return "Kısmi";
    case "pending":
      return "Bekliyor";
    case "manual":
      return "Manuel";
    default:
      return status;
  }
}

export function SocialConnectionsPanel({
  snapshot,
  busy,
  onConnect,
  onDisconnect,
  onRoadmapInterest,
  onRoadmapConnect,
  onRoadmapDisconnect,
  onRoadmapRefreshToken,
  onTelegramChannelSetup,
  onTelegramDiscussionSetup,
  integrationGateExpanded = false,
  highlightPlatformCode = null,
}: ConnectionsProps) {
  const highlightRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (!highlightPlatformCode || !highlightRef.current) {
      return;
    }
    highlightRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [highlightPlatformCode, snapshot.connections?.length]);

  const permissions = snapshot.permissions ?? {
    canManageConnections: false,
    canPublish: false,
    canApprovePosts: false,
    canSubmitForApproval: false,
    canReply: false,
    canManageTemplates: false,
    canManageSettings: false,
  };
  const connections = snapshot.connections ?? [];
  const providers = snapshot.providers ?? [];
  const roadmapProviders = snapshot.roadmapProviders ?? [];
  const opsLogEntries = useMemo(
    () => buildConnectionsOpsLog(snapshot),
    [snapshot],
  );
  const gateSummary = snapshot.integrationGate
    ? `${snapshot.integrationGate.automatedReadyCount}/${snapshot.integrationGate.automatedStepCount} otomatik adım`
    : null;

  return (
    <section className="social-hub-connections-shell module-panel module-panel--elevated">
      <div className="social-hub-connections-layout">
        <div className="social-hub-connections-main">
          <header className="social-hub-panel-head social-hub-panel-head--premium">
            <div>
              <h2 className="account-card-title">Bağlı hesaplar</h2>
              <p className="social-hub-connections-lead">
                Kanallarınızı bağlayın; mesajlar ve yayınlar tek yerden yönetilir.
              </p>
            </div>
            {gateSummary ? (
              <p className="social-hub-gate-chip" title="Detaylar operasyon günlüğünde">
                Entegrasyon: <strong>{gateSummary}</strong>
              </p>
            ) : null}
          </header>

          {snapshot.integrationGate &&
          (integrationGateExpanded || gateSummary) ? (
            <details
              className="social-hub-integration-gate-details"
              open={integrationGateExpanded}
            >
              <summary className="social-hub-health-settings-summary">
                Entegrasyon kapısı (BC) — {gateSummary ?? "özet"}
              </summary>
              <p className="social-hub-connection-summary">
                {snapshot.integrationGate.note}
              </p>
              <ul className="social-hub-integration-gate-steps">
                {snapshot.integrationGate.steps.map((step) => (
                  <li
                    key={step.code}
                    className={`social-hub-integration-gate-step social-hub-integration-gate-step--${step.status}`}
                  >
                    <span className="social-hub-integration-gate-step-code">
                      {step.code}
                    </span>
                    <strong>{step.title}</strong>
                    <span className="social-hub-stat-chip">
                      {integrationGateStepLabel(step.status)}
                    </span>
                    <p className="module-hint">{step.detail}</p>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <ul className="social-hub-connection-grid social-hub-connection-grid--premium">
            {connections.map((row) => {
              const provider = providers.find(
                (p) => p.platformCode === row.platformCode,
              );
              const connectLabel =
                row.statusCode === "CONNECTED" ? "Yeniden bağlan" : "Bağla";
              const isRoadmapConnection = ROADMAP_CONNECTION_PLATFORM_CODES.has(
                row.platformCode,
              );
              const canRoadmapOAuth =
                isRoadmapConnection &&
                onRoadmapConnect &&
                row.oauthReady !== false;
              const hasWarnings = (row.setupWarnings?.length ?? 0) > 0;
              const hasError = Boolean(row.lastErrorMessage?.trim());
              const needsOAuthConfig =
                provider?.implementationStatus === "pending" ||
                row.oauthReady === false;
              const isHighlighted =
                highlightPlatformCode != null &&
                row.platformCode === highlightPlatformCode;
              return (
                <li
                  key={row.id}
                  id={`social-hub-connection-${row.platformCode}`}
                  ref={isHighlighted ? highlightRef : undefined}
                  className={
                    isHighlighted
                      ? "social-hub-connection-card social-hub-connection-card--premium social-hub-connection-card--focused"
                      : "social-hub-connection-card social-hub-connection-card--premium"
                  }
                >
                  <div className="social-hub-connection-main">
                    <div className="social-hub-connection-title-row">
                      <h3>{row.label}</h3>
                      <span className={connectionStatusBadgeClass(row.statusCode)}>
                        {statusLabel(row.statusCode)}
                      </span>
                    </div>
                    {row.displayName ? (
                      <p className="social-hub-connection-account">
                        {row.displayName}
                      </p>
                    ) : null}
                    {row.platformCode === "TELEGRAM" &&
                    row.statusCode === "CONNECTED" ? (
                      <>
                        <p className="social-hub-connection-account">
                          Yayın kanalı:{" "}
                          {row.telegramPublishChannel?.username
                            ? `@${row.telegramPublishChannel.username.replace(/^@/, "")}`
                            : row.telegramPublishChannel?.title ??
                              "Henüz tanımlı değil"}
                        </p>
                        <p className="social-hub-connection-account">
                          Kanal yorumları:{" "}
                          {row.telegramDiscussionGroup?.title ??
                            (row.telegramDiscussionGroup?.chatId
                              ? row.telegramDiscussionGroup.chatId
                              : "Kanal kaydında otomatik veya manuel bağlanır")}
                        </p>
                      </>
                    ) : null}
                    <p className="social-hub-connection-summary">
                      {connectionUserSummary(
                        row.statusCode,
                        hasWarnings || needsOAuthConfig,
                        hasError,
                      )}
                    </p>
                  </div>
                  <div className="social-hub-connection-actions">
                    {permissions.canManageConnections ? (
                      <>
                        <button
                          type="button"
                          className="btn-account-primary"
                          disabled={busy || row.oauthReady === false}
                          onClick={() =>
                            canRoadmapOAuth
                              ? onRoadmapConnect!(row.platformCode)
                              : onConnect(row.platformCode)
                          }
                        >
                          {connectLabel}
                        </button>
                        {row.platformCode === "TELEGRAM" &&
                        row.statusCode === "CONNECTED" &&
                        onTelegramChannelSetup ? (
                          <button
                            type="button"
                            className="btn-account-secondary"
                            disabled={busy}
                            onClick={() => onTelegramChannelSetup()}
                          >
                            Kanal yayını
                          </button>
                        ) : null}
                        {row.platformCode === "TELEGRAM" &&
                        row.statusCode === "CONNECTED" &&
                        onTelegramDiscussionSetup ? (
                          <button
                            type="button"
                            className="btn-account-secondary"
                            disabled={busy}
                            onClick={() => onTelegramDiscussionSetup()}
                          >
                            Yorum grubu
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn-account-ghost"
                          disabled={
                            busy ||
                            row.statusCode === "DISCONNECTED" ||
                            row.statusCode === "PENDING_OAUTH"
                          }
                          onClick={() =>
                            isRoadmapConnection && onRoadmapDisconnect
                              ? onRoadmapDisconnect(row.platformCode)
                              : onDisconnect(row.platformCode)
                          }
                        >
                          Kes
                        </button>
                      </>
                    ) : (
                      <p className="module-hint">Yalnızca firma sahibi / sosyal yönetici.</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {roadmapProviders.length > 0 ? (
            <>
              <h3 className="social-hub-subsection-heading">Yakında</h3>
              <p className="social-hub-connections-lead social-hub-connections-lead--compact">
                Yeni kanallar için öncelik bildirin; teknik detaylar günlükte.
              </p>
              <ul className="social-hub-connection-grid social-hub-connection-grid--premium">
                {roadmapProviders.map((row: SocialHubRoadmapProvider) => {
                  const primaryPill = roadmapPrimaryPill(row);
                  const connected =
                    row.roadmapConnectionStatusCode === "CONNECTED";
                  return (
                    <li
                      key={row.platformCode}
                      className="social-hub-connection-card social-hub-connection-card--premium social-hub-connection-card--roadmap"
                    >
                      <div className="social-hub-connection-main">
                        <div className="social-hub-connection-title-row">
                          <h3>{row.label}</h3>
                          <span className={primaryPill.className}>
                            {primaryPill.label}
                          </span>
                        </div>
                        {row.roadmapConnectionStatusCode ? (
                          <span
                            className={connectionStatusBadgeClass(
                              row.roadmapConnectionStatusCode,
                            )}
                          >
                            {statusLabel(row.roadmapConnectionStatusCode)}
                          </span>
                        ) : null}
                        {row.roadmapInterested ? (
                          <span className="social-hub-pill social-hub-pill--interest">
                            Öncelik bildirildi
                          </span>
                        ) : null}
                        <p className="social-hub-connection-summary">
                          {connected
                            ? "Bağlı — Mesajlar ve yayınlar için kullanılabilir."
                            : row.oauthEnvConfigured
                              ? "Bağlanmaya hazır — «Bağla» ile devam edin."
                              : "Hazırlanıyor — öncelik verebilirsiniz."}
                        </p>
                      </div>
                      <div className="social-hub-connection-actions social-hub-connection-actions--stack">
                        {permissions.canManageConnections && onRoadmapInterest ? (
                          <button
                            type="button"
                            className={
                              row.roadmapInterested
                                ? "btn-account-ghost"
                                : "btn-account-primary"
                            }
                            disabled={busy}
                            onClick={() =>
                              onRoadmapInterest(
                                row.platformCode,
                                !row.roadmapInterested,
                              )
                            }
                          >
                            {row.roadmapInterested ? "Önceliği kaldır" : "Öncelik ver"}
                          </button>
                        ) : null}
                        {permissions.canManageConnections &&
                        onRoadmapConnect &&
                        row.oauthEnvConfigured ? (
                          <button
                            type="button"
                            className="btn-account-primary"
                            disabled={
                              busy ||
                              row.roadmapConnectionStatusCode === "CONNECTED" ||
                              row.roadmapConnectionStatusCode === "PENDING_OAUTH"
                            }
                            onClick={() => onRoadmapConnect(row.platformCode)}
                          >
                            {roadmapConnectLabel(row)}
                          </button>
                        ) : null}
                        {permissions.canManageConnections &&
                        onRoadmapRefreshToken &&
                        row.roadmapConnectionStatusCode === "CONNECTED" &&
                        row.roadmapHasRefreshToken ? (
                          <button
                            type="button"
                            className="btn-account-ghost"
                            disabled={busy}
                            onClick={() => onRoadmapRefreshToken(row.platformCode)}
                          >
                            Token yenile
                          </button>
                        ) : null}
                        {permissions.canManageConnections &&
                        onRoadmapDisconnect &&
                        row.roadmapConnectionStatusCode === "CONNECTED" ? (
                          <button
                            type="button"
                            className="btn-account-ghost"
                            disabled={busy}
                            onClick={() => onRoadmapDisconnect(row.platformCode)}
                          >
                            Bağlantıyı kes
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>

        <SocialHubOpsLogRail entries={opsLogEntries} />
      </div>
    </section>
  );
}

type InboxProps = {
  snapshot: SocialHubSnapshot;
  threadsPreview: SocialHubInboxThreadPreview[];
  threadsPreviewLoading: boolean;
  busy: boolean;
  onSync: (platformCode: string) => void;
  onSeedDemo?: () => void;
  canSeedDemo?: boolean;
  messagingInboxHref?: string;
  threadMessagingHref?: (threadId: string) => string;
};

export function SocialInboxPanel({
  snapshot,
  threadsPreview,
  threadsPreviewLoading,
  busy,
  onSync,
  onSeedDemo,
  canSeedDemo,
  messagingInboxHref,
  threadMessagingHref,
}: InboxProps) {
  const inboxSummary = {
    ...(snapshot.inboxSummary ?? {
      totalOpenThreads: 0,
      byPlatform: [],
      messagingDeepLink: "/messaging?tab=sohbet&filter=social",
      note: "Sosyal konuşmalar Mesajlar listesinde listelenir.",
    }),
    messagingDeepLink:
      messagingInboxHref ??
      snapshot.inboxSummary?.messagingDeepLink ??
      "/messaging?tab=sohbet&filter=social",
  };
  const permissions = snapshot.permissions ?? {
    canManageConnections: false,
    canPublish: false,
    canApprovePosts: false,
    canSubmitForApproval: false,
    canReply: false,
    canManageTemplates: false,
    canManageSettings: false,
  };
  const connections = snapshot.connections ?? [];
  const providers = snapshot.providers ?? [];
  const roadmapProviders = snapshot.roadmapProviders ?? [];
  const platformLabel = (code: string) =>
    providers.find((p) => p.platformCode === code)?.label ??
    roadmapProviders.find((p) => p.platformCode === code)?.label ??
    code;
  const opsLogEntries = useMemo(
    () => buildInboxOpsLog({ snapshot, threadsPreview }),
    [snapshot, threadsPreview],
  );
  const unreadTotal = threadsPreview.reduce(
    (sum, row) => sum + (row.unreadCount > 0 ? row.unreadCount : 0),
    0,
  );

  return (
    <section className="social-hub-connections-shell module-panel module-panel--elevated">
      <div className="social-hub-connections-layout">
        <div className="social-hub-connections-main social-hub-inbox-main">
          <header className="social-hub-panel-head social-hub-panel-head--premium">
            <div>
              <h2 className="account-card-title">Sosyal gelen kutusu</h2>
              <p className="social-hub-connections-lead">
                {inboxPanelLead(inboxSummary.totalOpenThreads)}
              </p>
            </div>
            <div className="social-hub-stat-chips">
              <span className="social-hub-stat-chip social-hub-stat-chip--ok">
                {inboxSummary.totalOpenThreads} açık konuşma
              </span>
              {unreadTotal > 0 ? (
                <span className="social-hub-stat-chip social-hub-stat-chip--warn">
                  {unreadTotal} okunmamış
                </span>
              ) : null}
            </div>
          </header>

          {threadsPreviewLoading ? (
            <p className="module-hint">Son konuşmalar yükleniyor…</p>
          ) : threadsPreview.length > 0 ? (
            <div className="social-hub-inbox-preview social-hub-inbox-preview--premium">
              <h3 className="social-hub-subsection-heading">Son konuşmalar</h3>
              <ul className="social-hub-inbox-preview-list">
                {threadsPreview.map((row) => (
                  <li
                    key={row.threadId}
                    className="social-hub-inbox-preview-row social-hub-inbox-preview-row--premium"
                  >
                    <div className="social-hub-inbox-preview-main">
                      <div className="social-hub-connection-title-row">
                        <strong className="social-hub-inbox-preview-label">
                          {row.displayLabel}
                        </strong>
                        <span className="social-hub-inbox-preview-channel">
                          {row.platformLabel}
                        </span>
                      </div>
                      {row.lastMessagePreview ? (
                        <p className="social-hub-inbox-preview-snippet">
                          {row.lastMessagePreview}
                        </p>
                      ) : null}
                    </div>
                    <div className="social-hub-inbox-preview-actions">
                      {row.unreadCount > 0 ? (
                        <span className="social-hub-inbox-preview-unread">
                          {row.unreadCount}
                        </span>
                      ) : null}
                      <Link
                        href={
                          threadMessagingHref?.(row.threadId) ??
                          row.messagingDeepLink
                        }
                        className="btn-account-primary"
                      >
                        Aç
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="social-hub-inbox-empty-premium">
              <p className="social-hub-connection-summary">
                Henüz sosyal konuşma yok. Bağlı hesaplardan kanal ekleyin veya
                demo ile deneyin.
              </p>
            </div>
          )}

          {inboxSummary.byPlatform.length > 0 ? (
            <>
              <h3 className="social-hub-subsection-heading">Kanallara göre</h3>
              <ul className="social-hub-health-grid social-hub-health-grid--premium">
                {inboxSummary.byPlatform.map((row) => {
                  const label = platformLabel(row.platformCode);
                  return (
                    <li
                      key={row.platformCode}
                      className="social-hub-health-card social-hub-health-card--premium"
                    >
                      <div className="social-hub-connection-title-row">
                        <h3>{label}</h3>
                        <span
                          className={
                            row.openCount > 0
                              ? "social-hub-stat-chip social-hub-stat-chip--ok"
                              : "social-hub-stat-chip"
                          }
                        >
                          {row.openCount} açık
                        </span>
                      </div>
                      <p className="social-hub-connection-summary">
                        {inboxPlatformSummary(row.openCount)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}

          {!snapshot.settings.kvkkAcceptedAt ? (
            <p className="social-hub-kvkk-hint">
              Demo veya senkron için{" "}
              <strong>Ekip &amp; izinler</strong> sekmesinden KVKK onayı gerekir
              (ayrıntı günlükte).
            </p>
          ) : null}

          {snapshot.inboxSyncSummary?.channels?.length ? (
            <div className="social-hub-inbox-sync-summary">
              <h3 className="social-hub-subsection-heading">Kanal senkron özet</h3>
              <p className="social-hub-connection-summary">
                Son özet:{" "}
                {new Date(snapshot.inboxSyncSummary.generatedAt).toLocaleString(
                  "tr-TR",
                )}
              </p>
              <ul className="social-hub-health-grid social-hub-health-grid--premium">
                {snapshot.inboxSyncSummary.channels.map((row) => {
                  const canSync =
                    row.connectionStatusCode === "CONNECTED" &&
                    (row.inboxHistorySync || row.inboxWebhook);
                  return (
                    <li
                      key={row.platformCode}
                      className="social-hub-health-card social-hub-health-card--premium"
                    >
                      <div className="social-hub-connection-title-row">
                        <h3>{row.label}</h3>
                        <span
                          className={
                            row.openCount > 0
                              ? "social-hub-stat-chip social-hub-stat-chip--ok"
                              : "social-hub-stat-chip"
                          }
                        >
                          {row.openCount} açık
                        </span>
                      </div>
                      <p className="social-hub-connection-summary">
                        Webhook (24s): {row.webhookInboundBridged24h}
                        {row.dmInboxGateLabel
                          ? ` · ${row.dmInboxGateLabel}`
                          : row.inboxHistorySync
                            ? " · Geçmiş sync"
                            : row.inboxWebhook
                              ? " · Webhook gelen kutusu"
                              : ""}
                      </p>
                      {row.lastSyncAt ? (
                        <p className="module-hint social-hub-inbox-sync-last">
                          Son sync:{" "}
                          {new Date(row.lastSyncAt).toLocaleString("tr-TR")}
                          {row.lastSyncMessage ? ` — ${row.lastSyncMessage}` : ""}
                        </p>
                      ) : (
                        <p className="module-hint social-hub-inbox-sync-last">
                          Henüz senkron kaydı yok.
                        </p>
                      )}
                      {canSync ? (
                        <button
                          type="button"
                          className="btn-account-ghost"
                          disabled={busy}
                          onClick={() => onSync(row.platformCode)}
                        >
                          Senkron
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="social-hub-inbox-actions-premium">
            <Link
              href={inboxSummary.messagingDeepLink}
              className="btn-account-primary"
            >
              Mesajlar&apos;a git
            </Link>
            {canSeedDemo && onSeedDemo ? (
              <button
                type="button"
                className="btn-account-ghost"
                disabled={busy || !snapshot.settings.kvkkAcceptedAt}
                onClick={onSeedDemo}
              >
                Demo gelen kutusu
              </button>
            ) : null}
          </div>

          {permissions.canReply || permissions.canManageConnections ? (
            <details className="social-hub-health-settings-details">
              <summary className="social-hub-health-settings-summary">
                Kanal senkronu
              </summary>
              <p className="social-hub-connection-summary">
                Bağlı kanallar için geçmiş mesaj senkronu. Teknik sync notları
                operasyon günlüğünde.
              </p>
              <div className="social-hub-sync-grid">
                {connections
                  .filter((c) => c.statusCode === "CONNECTED")
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="btn-account-ghost"
                      disabled={busy}
                      onClick={() => onSync(c.platformCode)}
                    >
                      {c.label} · senkron
                    </button>
                  ))}
              </div>
            </details>
          ) : null}
        </div>

        <SocialHubOpsLogRail entries={opsLogEntries} />
      </div>
    </section>
  );
}

type PublishingProps = {
  posts: SocialHubPost[];
  permissions: SocialHubPermissions;
  ownerApprovalRequired: boolean;
  draftText: string;
  draftPlatforms: string[];
  draftMedia: Array<{ mediaRef: string; previewUrl: string; filename: string }>;
  draftUtmCampaign: string;
  draftUtmSource: string;
  draftUtmMedium: string;
  draftUtmContent: string;
  busy: boolean;
  onDraftText: (value: string) => void;
  onDraftUtmCampaign: (value: string) => void;
  onDraftUtmSource: (value: string) => void;
  onDraftUtmMedium: (value: string) => void;
  onDraftUtmContent: (value: string) => void;
  onTogglePlatform: (code: string) => void;
  onAddMediaFiles: (files: FileList | null) => void;
  onRemoveDraftMedia: (mediaRef: string) => void;
  onCreateDraft: () => void;
  onPublish: (postId: string) => void;
  onSchedule: (postId: string, scheduledAt: string | null) => void;
  onSubmitApproval: (postId: string) => void;
  onApprove: (postId: string) => void;
  onCancel: (postId: string) => void;
  onDelete: (postId: string) => void;
  platformOptions: { code: string; label: string }[];
  calendarPosts: SocialHubPost[];
  calendarLoading: boolean;
  calendarAnchor: Date;
  calendarMode: "month" | "week";
  calendarSelection: string[];
  onCalendarAnchorChange: (next: Date) => void;
  onCalendarModeChange: (mode: "month" | "week") => void;
  onToggleCalendarSelect: (postId: string) => void;
  onBulkCancelSelected: () => void;
  onBulkRetrySelected: () => void;
  publishingEnabled?: boolean;
  integrationOpsHints?: SocialHubSnapshot["integrationOpsHints"];
};

export function SocialPublishingPanel({
  posts,
  permissions,
  ownerApprovalRequired,
  draftText,
  draftPlatforms,
  draftMedia,
  draftUtmCampaign,
  draftUtmSource,
  draftUtmMedium,
  draftUtmContent,
  busy,
  onDraftText,
  onDraftUtmCampaign,
  onDraftUtmSource,
  onDraftUtmMedium,
  onDraftUtmContent,
  onTogglePlatform,
  onAddMediaFiles,
  onRemoveDraftMedia,
  onCreateDraft,
  onPublish,
  onSchedule,
  onSubmitApproval,
  onApprove,
  onCancel,
  onDelete,
  platformOptions,
  calendarPosts,
  calendarLoading,
  calendarAnchor,
  calendarMode,
  calendarSelection,
  onCalendarAnchorChange,
  onCalendarModeChange,
  onToggleCalendarSelect,
  onBulkCancelSelected,
  onBulkRetrySelected,
  publishingEnabled,
  integrationOpsHints,
}: PublishingProps) {
  const platformLabelByCode = (code: string) =>
    platformOptions.find((p) => p.code === code)?.label ?? code;
  const opsLogEntries = useMemo(
    () =>
      buildPublishingOpsLog({
        posts,
        permissions,
        ownerApprovalRequired,
        publishingEnabled,
        integrationOpsHints,
        platformLabelByCode,
      }),
    [
      posts,
      permissions,
      ownerApprovalRequired,
      publishingEnabled,
      integrationOpsHints,
      platformOptions,
    ],
  );
  const postStats = useMemo(() => {
    let draft = 0;
    let scheduled = 0;
    let failed = 0;
    let published = 0;
    for (const post of posts) {
      if (post.statusCode === "DRAFT") {
        draft += 1;
      }
      if (
        post.statusCode === "SCHEDULED" ||
        post.statusCode === "PENDING_APPROVAL"
      ) {
        scheduled += 1;
      }
      if (post.statusCode === "FAILED") {
        failed += 1;
      }
      if (post.statusCode === "PUBLISHED") {
        published += 1;
      }
    }
    return { draft, scheduled, failed, published };
  }, [posts]);
  const gridCells =
    calendarMode === "month"
      ? buildMonthGrid(calendarAnchor)
      : buildWeekGrid(calendarAnchor);
  const postsByDay = new Map<string, SocialHubPost[]>();
  for (const post of calendarPosts) {
    if (!post.scheduledAt) {
      continue;
    }
    const key = toDateKey(new Date(post.scheduledAt));
    const bucket = postsByDay.get(key) ?? [];
    bucket.push(post);
    postsByDay.set(key, bucket);
  }
  const scheduledUpcoming = posts
    .filter(
      (p) =>
        p.scheduledAt &&
        (p.statusCode === "SCHEDULED" || p.statusCode === "PENDING_APPROVAL"),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime(),
    );

  const editableStatuses = new Set([
    "DRAFT",
    "PENDING_APPROVAL",
    "APPROVED",
    "SCHEDULED",
    "FAILED",
  ]);

  return (
    <section className="social-hub-connections-shell module-panel module-panel--elevated">
      <div className="social-hub-connections-layout">
        <div className="social-hub-connections-main social-hub-publishing-main">
          <header className="social-hub-panel-head social-hub-panel-head--premium">
            <div>
              <h2 className="account-card-title">Yayınlar</h2>
              <p className="social-hub-connections-lead">
                {publishingPanelLead(scheduledUpcoming.length)}
              </p>
            </div>
            <div className="social-hub-stat-chips">
              {postStats.scheduled > 0 ? (
                <span className="social-hub-stat-chip social-hub-stat-chip--ok">
                  {postStats.scheduled} zamanlı / onay
                </span>
              ) : null}
              {postStats.draft > 0 ? (
                <span className="social-hub-stat-chip">
                  {postStats.draft} taslak
                </span>
              ) : null}
              {postStats.failed > 0 ? (
                <span className="social-hub-stat-chip social-hub-stat-chip--warn">
                  {postStats.failed} başarısız
                </span>
              ) : null}
              {postStats.published > 0 ? (
                <span className="social-hub-stat-chip social-hub-stat-chip--ok">
                  {postStats.published} yayında
                </span>
              ) : null}
            </div>
          </header>
          {ownerApprovalRequired ? (
            <p className="social-hub-approval-chip">
              Onay gerekli — sahip veya sosyal yönetici onaylar.
            </p>
          ) : null}
      <div className="social-hub-calendar-grid-wrap social-hub-calendar-grid-wrap--premium">
        <div className="social-hub-calendar-toolbar">
          <h3 className="social-hub-calendar-title">Yayın takvimi</h3>
          <div className="social-hub-calendar-toolbar-actions">
            <button
              type="button"
              className="btn-account-ghost"
              disabled={busy}
              onClick={() => {
                const prev = new Date(calendarAnchor);
                prev.setMonth(prev.getMonth() - 1);
                onCalendarAnchorChange(prev);
              }}
            >
              ←
            </button>
            <span className="social-hub-calendar-month-label">
              {monthLabelTr(calendarAnchor)}
            </span>
            <button
              type="button"
              className="btn-account-ghost"
              disabled={busy}
              onClick={() => {
                const next = new Date(calendarAnchor);
                next.setMonth(next.getMonth() + 1);
                onCalendarAnchorChange(next);
              }}
            >
              →
            </button>
            <button
              type="button"
              className={
                calendarMode === "month"
                  ? "btn-account-primary"
                  : "btn-account-ghost"
              }
              disabled={busy}
              onClick={() => onCalendarModeChange("month")}
            >
              Ay
            </button>
            <button
              type="button"
              className={
                calendarMode === "week"
                  ? "btn-account-primary"
                  : "btn-account-ghost"
              }
              disabled={busy}
              onClick={() => onCalendarModeChange("week")}
            >
              Hafta
            </button>
          </div>
        </div>
        {calendarLoading ? (
          <p className="module-hint">Takvim yükleniyor…</p>
        ) : (
          <>
            <div className="social-hub-calendar-weekdays">
              {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div
              className={
                calendarMode === "month"
                  ? "social-hub-calendar-grid"
                  : "social-hub-calendar-grid social-hub-calendar-grid--week"
              }
            >
              {gridCells.map((cell) => {
                const dayPosts = postsByDay.get(cell.dateKey) ?? [];
                return (
                  <div
                    key={cell.dateKey}
                    className={
                      cell.inMonth
                        ? "social-hub-calendar-day"
                        : "social-hub-calendar-day social-hub-calendar-day--muted"
                    }
                  >
                    <span className="social-hub-calendar-day-num">
                      {cell.date.getDate()}
                    </span>
                    <ul className="social-hub-calendar-day-posts">
                      {dayPosts.map((post) => (
                        <li key={post.id}>
                          <label className="social-hub-calendar-post-chip">
                            <input
                              type="checkbox"
                              checked={calendarSelection.includes(post.id)}
                              onChange={() => onToggleCalendarSelect(post.id)}
                            />
                            <span title={post.bodyText}>
                              {postStatusLabel(post.statusCode)} ·{" "}
                              {post.bodyText.slice(0, 24)}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {calendarSelection.length > 0 ? (
          <div className="social-hub-calendar-bulk">
            <span className="module-hint">{calendarSelection.length} seçili</span>
            <button
              type="button"
              className="btn-account-ghost"
              disabled={busy}
              onClick={onBulkCancelSelected}
            >
              Toplu iptal
            </button>
            {permissions.canPublish ? (
              <button
                type="button"
                className="btn-account-primary"
                disabled={busy}
                onClick={onBulkRetrySelected}
              >
                Başarısızları yeniden dene
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {scheduledUpcoming.length > 0 ? (
        <div className="social-hub-calendar-strip">
          <h3 className="social-hub-calendar-title">Yaklaşan zamanlamalar</h3>
          <ul className="social-hub-calendar-list">
            {scheduledUpcoming.slice(0, 6).map((post) => (
              <li key={post.id}>
                <time dateTime={post.scheduledAt!}>
                  {formatSchedule(post.scheduledAt)}
                </time>
                <span>{postStatusLabel(post.statusCode)}</span>
                <span className="social-hub-calendar-snippet">
                  {post.bodyText.slice(0, 48)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {permissions.canPublish || permissions.canSubmitForApproval ? (
        <div className="social-hub-compose social-hub-compose-premium">
          <h3 className="social-hub-subsection-heading">Yeni taslak</h3>
          <label className="label-light">
            Gönderi metni
            <textarea
              className="input-light account-textarea"
              rows={4}
              value={draftText}
              onChange={(e) => onDraftText(e.target.value)}
            />
          </label>
          <fieldset className="social-hub-platform-picks">
            <legend>Kanallar</legend>
            {platformOptions.map((p) => (
              <label key={p.code} className="social-hub-check">
                <input
                  type="checkbox"
                  checked={draftPlatforms.includes(p.code)}
                  onChange={() => onTogglePlatform(p.code)}
                />
                {p.label}
              </label>
            ))}
          </fieldset>
          <label className="label-light">
            Görsel (JPEG/PNG/GIF/WebP, en fazla 4)
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              disabled={busy || draftMedia.length >= 4}
              onChange={(e) => {
                onAddMediaFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {draftMedia.length > 0 ? (
            <ul className="social-hub-draft-media-list">
              {draftMedia.map((item) => (
                <li key={item.mediaRef} className="social-hub-draft-media-item">
                  <img src={item.previewUrl} alt={item.filename} />
                  <span className="module-hint">{item.filename}</span>
                  <button
                    type="button"
                    className="btn-account-ghost"
                    disabled={busy}
                    onClick={() => onRemoveDraftMedia(item.mediaRef)}
                  >
                    Kaldır
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <details className="social-hub-utm-details">
            <summary className="module-hint">Kampanya linkleri (UTM)</summary>
            <p className="module-hint">
              Metindeki https bağlantılarına yayın anında utm_* eklenir (Telegram Ads
              paneli entegrasyonu değil).
            </p>
            <label className="label-light">
              utm_campaign (zorunlu)
              <input
                className="input-light"
                value={draftUtmCampaign}
                onChange={(e) => onDraftUtmCampaign(e.target.value)}
                placeholder="nakliye-kampanya-2026"
              />
            </label>
            <label className="label-light">
              utm_source
              <input
                className="input-light"
                value={draftUtmSource}
                onChange={(e) => onDraftUtmSource(e.target.value)}
                placeholder="lerta"
              />
            </label>
            <label className="label-light">
              utm_medium
              <input
                className="input-light"
                value={draftUtmMedium}
                onChange={(e) => onDraftUtmMedium(e.target.value)}
                placeholder="social"
              />
            </label>
            <label className="label-light">
              utm_content
              <input
                className="input-light"
                value={draftUtmContent}
                onChange={(e) => onDraftUtmContent(e.target.value)}
                placeholder="opsiyonel"
              />
            </label>
          </details>
          <button
            type="button"
            className="btn-account-primary"
            disabled={busy || !draftText.trim()}
            onClick={onCreateDraft}
          >
            Taslak kaydet
          </button>
        </div>
      ) : (
        <p className="social-hub-connection-summary">
          Yayınlama yetkiniz yok — ayrıntı operasyon günlüğünde.
        </p>
      )}
      <h3 className="social-hub-subsection-heading">Gönderiler</h3>
      <ul className="social-hub-post-list social-hub-post-list--premium">
        {posts.length === 0 ? (
          <li className="social-hub-inbox-empty-premium">
            <p className="social-hub-connection-summary">Henüz gönderi yok.</p>
          </li>
        ) : (
          posts.map((post) => {
            const platformLabels = post.platformCodes.map(platformLabelByCode);
            return (
            <li
              key={post.id}
              className="social-hub-post-item social-hub-post-item--premium"
            >
              <div className="social-hub-post-body">
                <div className="social-hub-connection-title-row">
                  <span className={postStatusBadgeClass(post.statusCode)}>
                    {postStatusLabel(post.statusCode)}
                  </span>
                  {post.mediaUrls?.length ? (
                    <span className="social-hub-stat-chip">
                      {post.mediaUrls.length} görsel
                    </span>
                  ) : null}
                  {post.utm?.utmCampaign ? (
                    <span className="social-hub-stat-chip">
                      UTM: {post.utm.utmCampaign}
                    </span>
                  ) : null}
                </div>
                <p className="social-hub-connection-summary">
                  {postUserSummary(post, platformLabels)}
                </p>
                <p className="social-hub-post-preview">{post.bodyText.slice(0, 200)}</p>
                {post.lastErrorMessage ? (
                  <p className="social-hub-delivery-error-hint">
                    Yayın hatası — ayrıntı operasyon günlüğünde.
                  </p>
                ) : post.statusCode === "PUBLISHED" ? (
                  <p className="social-hub-publish-ok">Kanallarda yayınlandı.</p>
                ) : null}
                {editableStatuses.has(post.statusCode) ? (
                  <label className="label-light social-hub-schedule-field">
                    Zamanla
                    <input
                      type="datetime-local"
                      className="input-light"
                      disabled={busy}
                      value={toDatetimeLocalValue(post.scheduledAt)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        onSchedule(post.id, raw ? new Date(raw).toISOString() : null);
                      }}
                    />
                  </label>
                ) : null}
              </div>
              <div className="social-hub-post-actions">
                {permissions.canApprovePosts &&
                post.statusCode === "PENDING_APPROVAL" ? (
                  <button
                    type="button"
                    className="btn-account-primary"
                    disabled={busy}
                    onClick={() => onApprove(post.id)}
                  >
                    Onayla
                  </button>
                ) : null}
                {permissions.canSubmitForApproval &&
                (post.statusCode === "DRAFT" || post.statusCode === "FAILED") ? (
                  <button
                    type="button"
                    className="btn-account-ghost"
                    disabled={busy}
                    onClick={() => onSubmitApproval(post.id)}
                  >
                    Onaya gönder
                  </button>
                ) : null}
                {permissions.canPublish &&
                ["DRAFT", "APPROVED", "SCHEDULED", "FAILED"].includes(
                  post.statusCode,
                ) ? (
                  <button
                    type="button"
                    className="btn-account-ghost"
                    disabled={busy}
                    onClick={() => onPublish(post.id)}
                  >
                    Yayınla (dene)
                  </button>
                ) : null}
                {editableStatuses.has(post.statusCode) ? (
                  <>
                    <button
                      type="button"
                      className="btn-account-ghost"
                      disabled={busy}
                      onClick={() => onCancel(post.id)}
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      className="btn-account-ghost"
                      disabled={busy}
                      onClick={() => onDelete(post.id)}
                    >
                      Sil
                    </button>
                  </>
                ) : null}
              </div>
            </li>
            );
          })
        )}
      </ul>
        </div>
        <SocialHubOpsLogRail entries={opsLogEntries} />
      </div>
    </section>
  );
}

type TemplatesProps = {
  templates: SocialHubTemplate[];
  permissions: SocialHubPermissions;
  title: string;
  body: string;
  channelScope: string;
  serverPreview: string | null;
  messagingDeepLink: string;
  busy: boolean;
  onTitle: (v: string) => void;
  onBody: (v: string) => void;
  onChannelScope: (v: string) => void;
  onInsertPlaceholder: (placeholder: string) => void;
  onSave: () => void;
  onCopyRendered: (templateId: string) => void;
};

export function SocialTemplatesPanel({
  templates,
  permissions,
  title,
  body,
  channelScope,
  serverPreview,
  messagingDeepLink,
  busy,
  onTitle,
  onBody,
  onChannelScope,
  onInsertPlaceholder,
  onSave,
  onCopyRendered,
}: TemplatesProps) {
  const localPreview = renderSocialHubTemplatePreview(body, {});
  const previewText = serverPreview ?? localPreview;
  const opsLogEntries = useMemo(
    () =>
      buildTemplatesOpsLog({
        templates,
        permissions,
        serverPreview,
        draftBody: body,
      }),
    [templates, permissions, serverPreview, body],
  );

  return (
    <section className="social-hub-connections-shell module-panel module-panel--elevated">
      <div className="social-hub-connections-layout">
        <div className="social-hub-connections-main social-hub-templates-main">
          <header className="social-hub-panel-head social-hub-panel-head--premium">
            <div>
              <h2 className="account-card-title">Hazır yanıtlar</h2>
              <p className="social-hub-connections-lead">
                {templatesPanelLead(templates.length)}
              </p>
            </div>
            <div className="social-hub-stat-chips">
              <span className="social-hub-stat-chip social-hub-stat-chip--ok">
                {templates.length} şablon
              </span>
            </div>
          </header>
          <div className="social-hub-inbox-actions-premium">
            <Link className="btn-account-primary" href={messagingDeepLink}>
              Mesajlar&apos;da kullan
            </Link>
          </div>
          {permissions.canManageTemplates ? (
            <details className="social-hub-health-settings-details">
              <summary className="social-hub-health-settings-summary">
                Değişkenler
              </summary>
              <p className="social-hub-connection-summary">
                Metne eklemek için bir değişken seçin. Açıklamalar operasyon
                günlüğünde.
              </p>
              <div className="social-hub-template-vars social-hub-template-vars--premium">
                {SOCIAL_HUB_TEMPLATE_VARIABLE_HINTS.map((hint) => (
                  <button
                    key={hint.placeholder}
                    type="button"
                    className="btn-account-ghost social-hub-chip-btn"
                    disabled={busy}
                    onClick={() => onInsertPlaceholder(hint.placeholder)}
                  >
                    {hint.placeholder}
                  </button>
                ))}
              </div>
            </details>
          ) : (
            <p className="social-hub-connection-summary">
              Şablon düzenleme yetkiniz yok — ayrıntı operasyon günlüğünde.
            </p>
          )}
          {permissions.canManageTemplates ? (
            <div className="social-hub-compose social-hub-compose-premium">
              <h3 className="social-hub-subsection-heading">Yeni şablon</h3>
              <label className="label-light">
                Kanal kapsamı
                <select
                  className="input-light"
                  value={channelScope}
                  onChange={(e) => onChannelScope(e.target.value)}
                >
                  {TEMPLATE_CHANNEL_SCOPE_OPTIONS.map((opt) => (
                    <option key={opt.code || "all"} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="label-light">
                Başlık
                <input
                  className="input-light"
                  value={title}
                  onChange={(e) => onTitle(e.target.value)}
                />
              </label>
              <label className="label-light">
                Metin
                <textarea
                  className="input-light account-textarea"
                  rows={3}
                  value={body}
                  onChange={(e) => onBody(e.target.value)}
                />
              </label>
              {body.trim() ? (
                <div className="social-hub-template-preview social-hub-template-preview--premium">
                  <span className="social-hub-stat-label">Önizleme</span>
                  <p>{previewText}</p>
                </div>
              ) : null}
              <button
                type="button"
                className="btn-account-primary"
                disabled={busy || !title.trim() || !body.trim()}
                onClick={onSave}
              >
                Şablon ekle
              </button>
            </div>
          ) : null}
          <h3 className="social-hub-subsection-heading">Kayıtlı şablonlar</h3>
          <ul className="social-hub-template-list social-hub-template-list--premium">
            {templates.length === 0 ? (
              <li className="social-hub-inbox-empty-premium">
                <p className="social-hub-connection-summary">
                  Henüz şablon yok — yukarıdan ekleyin.
                </p>
              </li>
            ) : (
              templates.map((t) => {
                const resolved = renderSocialHubTemplatePreview(t.bodyText, {});
                return (
                  <li
                    key={t.id}
                    className="social-hub-post-item social-hub-post-item--premium"
                  >
                    <div className="social-hub-connection-title-row">
                      <strong>{t.title}</strong>
                      {t.channelScopeLabel || t.channelScopeCode ? (
                        <span className="social-hub-stat-chip">
                          {t.channelScopeLabel ?? t.channelScopeCode}
                        </span>
                      ) : (
                        <span className="social-hub-stat-chip">Tüm kanallar</span>
                      )}
                    </div>
                    <p className="social-hub-connection-summary">
                      {templateCardSummary(t)}
                    </p>
                    <p className="social-hub-post-preview">{resolved}</p>
                    <div className="social-hub-template-actions">
                      <button
                        type="button"
                        className="btn-account-ghost"
                        disabled={busy}
                        onClick={() => onCopyRendered(t.id)}
                      >
                        Kopyala
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
        <SocialHubOpsLogRail entries={opsLogEntries} />
      </div>
    </section>
  );
}

type AnalyticsProps = {
  snapshot: SocialHubSnapshot;
  analytics: SocialHubAnalytics | null;
  loading: boolean;
  busy?: boolean;
  highlightUtmCampaign?: string | null;
  onExportAnalytics?: () => void;
};

export function SocialAnalyticsPanel({
  snapshot,
  analytics,
  loading,
  busy = false,
  highlightUtmCampaign = null,
  onExportAnalytics,
}: AnalyticsProps) {
  const fallbackOpen = snapshot.inboxSummary?.totalOpenThreads ?? 0;
  return (
    <section className="social-hub-panel module-panel module-panel--elevated">
      <header className="social-hub-panel-head">
        <h2 className="account-card-title">İstatistikler</h2>
        <p className="account-card-lead">
          Gönderi durumları, gelen kutusu, webhook köprü denetimi, Meta / LinkedIn
          kanal özetleri ve kanal hazırlığı.
        </p>
        {onExportAnalytics ? (
          <button
            type="button"
            className="btn-account-ghost"
            disabled={busy || loading}
            onClick={onExportAnalytics}
          >
            Analitik CSV indir
          </button>
        ) : null}
      </header>
      {loading ? <p className="module-hint">Analitik yükleniyor…</p> : null}
      <div className="social-hub-stats-grid">
        <div className="social-hub-stat-card">
          <span className="social-hub-stat-value">
            {analytics?.connectedChannels ??
              snapshot.connections.filter((c) => c.statusCode === "CONNECTED").length}
          </span>
          <span className="social-hub-stat-label">Bağlı kanal</span>
        </div>
        <div className="social-hub-stat-card">
          <span className="social-hub-stat-value">
            {analytics?.publishedLast30Days ?? "—"}
          </span>
          <span className="social-hub-stat-label">Yayın (30 gün)</span>
        </div>
        <div className="social-hub-stat-card">
          <span className="social-hub-stat-value">
            {analytics?.openInboxThreads ?? fallbackOpen}
          </span>
          <span className="social-hub-stat-label">Açık gelen kutusu</span>
        </div>
        <div className="social-hub-stat-card">
          <span className="social-hub-stat-value">
            {analytics?.scheduledUpcoming ?? "—"}
          </span>
          <span className="social-hub-stat-label">Yaklaşan zamanlama</span>
        </div>
        <div className="social-hub-stat-card">
          <span className="social-hub-stat-value">
            {analytics?.pendingApproval ?? "—"}
          </span>
          <span className="social-hub-stat-label">Onay bekleyen</span>
        </div>
        <div className="social-hub-stat-card">
          <span className="social-hub-stat-value">
            {analytics?.templateCount ?? snapshot.templates.length}
          </span>
          <span className="social-hub-stat-label">Şablon</span>
        </div>
        <div className="social-hub-stat-card">
          <span className="social-hub-stat-value">
            {analytics?.webhookBridge?.inboundBridged24h ?? "—"}
          </span>
          <span className="social-hub-stat-label">Webhook köprü (24s)</span>
        </div>
        <div className="social-hub-stat-card">
          <span className="social-hub-stat-value">
            {analytics?.webhookBridge?.inboundBridged7d ?? "—"}
          </span>
          <span className="social-hub-stat-label">Webhook köprü (7g)</span>
        </div>
        <div className="social-hub-stat-card">
          <span className="social-hub-stat-value">
            {analytics?.webhookBridge?.inboundBridged30d ?? "—"}
          </span>
          <span className="social-hub-stat-label">Webhook köprü (30g)</span>
        </div>
      </div>
      {analytics?.webhookBridge &&
      (analytics.webhookBridge.byPlatform24h.length > 0 ||
        analytics.webhookBridge.lastInboundBridgedAt) ? (
        <p className="module-hint">
          Son webhook köprü:{" "}
          {analytics.webhookBridge.lastInboundBridgedAt
            ? new Date(analytics.webhookBridge.lastInboundBridgedAt).toLocaleString(
                "tr-TR",
              )
            : "—"}
          {analytics.webhookBridge.byPlatform24h.length > 0
            ? ` · ${analytics.webhookBridge.byPlatform24h
                .map((row) => `${row.label}: ${row.inboundBridged24h}`)
                .join(" · ")}`
            : ""}
        </p>
      ) : null}
      {analytics?.platformInsights && analytics.platformInsights.length > 0 ? (
        <div className="social-hub-platform-insights">
          <h3 className="social-hub-subsection-title">Kanal platform özetleri</h3>
          <p className="module-hint">
            Meta (Instagram / Facebook) ve LinkedIn şirket sayfası metrikleri; bağlı
            değilse veya izin yoksa satır durumu gösterilir.
          </p>
          <ul className="social-hub-platform-insight-list">
            {analytics.platformInsights.map((row) => (
              <li key={row.platformCode} className="social-hub-platform-insight-card">
                <div className="social-hub-platform-insight-head">
                  <strong>{row.label}</strong>
                  <span
                    className={`social-hub-platform-insight-status social-hub-platform-insight-status--${row.status}`}
                  >
                    {row.status === "ok"
                      ? "Güncel"
                      : row.status === "not_connected"
                        ? "Bağlı değil"
                        : "Kullanılamıyor"}
                  </span>
                </div>
                {row.status === "ok" ? (
                  <dl className="social-hub-platform-insight-metrics">
                    {row.followersCount != null ? (
                      <>
                        <dt>Takipçi</dt>
                        <dd>{row.followersCount.toLocaleString("tr-TR")}</dd>
                      </>
                    ) : null}
                    {row.followingCount != null ? (
                      <>
                        <dt>Takip</dt>
                        <dd>{row.followingCount.toLocaleString("tr-TR")}</dd>
                      </>
                    ) : null}
                    {row.mediaOrPostsCount != null ? (
                      <>
                        <dt>Gönderi</dt>
                        <dd>{row.mediaOrPostsCount.toLocaleString("tr-TR")}</dd>
                      </>
                    ) : null}
                    {row.impressions28d != null ? (
                      <>
                        <dt>Gösterim (28g)</dt>
                        <dd>{row.impressions28d.toLocaleString("tr-TR")}</dd>
                      </>
                    ) : null}
                    {row.engagedUsers28d != null ? (
                      <>
                        <dt>Erişim / etkileşim (28g)</dt>
                        <dd>{row.engagedUsers28d.toLocaleString("tr-TR")}</dd>
                      </>
                    ) : null}
                  </dl>
                ) : row.errorMessage ? (
                  <p className="module-hint">{row.errorMessage}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {analytics?.postsByStatus && Object.keys(analytics.postsByStatus).length > 0 ? (
        <ul className="social-hub-audit-list">
          {Object.entries(analytics.postsByStatus).map(([code, count]) => (
            <li key={code}>
              <span>{postStatusLabel(code)}</span>
              <span>{count}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {analytics?.utmCampaignPublishedLast30Days &&
      analytics.utmCampaignPublishedLast30Days.length > 0 ? (
        <div className="social-hub-analytics-utm">
          <h3 className="social-hub-subsection-heading">
            UTM kampanyaları (son 30 gün yayın)
          </h3>
          <ul className="social-hub-audit-list">
            {analytics.utmCampaignPublishedLast30Days.map((row) => (
              <li
                key={row.utmCampaign}
                className={
                  highlightUtmCampaign &&
                  row.utmCampaign === highlightUtmCampaign
                    ? "social-hub-analytics-utm-row social-hub-analytics-utm-row--highlight"
                    : "social-hub-analytics-utm-row"
                }
              >
                <span>{row.utmCampaign}</span>
                <span>{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

const SOCIAL_ROLE_LABELS: Record<string, string> = {
  SOCIAL_ADMIN: "Sosyal yönetici",
  DISPATCHER: "Dispatcher",
  VIEWER: "Görüntüleme",
  COMPANY_OWNER: "Firma sahibi",
};

type TeamProps = {
  settings: SocialHubSettings;
  permissions: SocialHubPermissions;
  members: SocialHubTeamMember[];
  assignableRoleCodes: string[];
  auditEntries: SocialHubAuditEntry[];
  auditFocus: "all" | "webhook";
  integrationsPath: string;
  busy: boolean;
  onPatchSettings: (
    patch: Record<string, boolean | string | null | undefined>,
  ) => void;
  onRoleChange: (userId: string, roleCode: string) => void;
  onAuditFocusChange: (focus: "all" | "webhook") => void;
  onExportAuditLog: () => void;
};

export function SocialTeamPanel({
  settings,
  permissions,
  members,
  assignableRoleCodes,
  auditEntries,
  auditFocus,
  integrationsPath,
  busy,
  onPatchSettings,
  onRoleChange,
  onAuditFocusChange,
  onExportAuditLog,
}: TeamProps) {
  const canManage = permissions.canManageSettings;
  const kvkkAccepted = Boolean(settings.kvkkAcceptedAt);
  const opsLogEntries = useMemo(
    () =>
      buildTeamOpsLog({
        settings,
        permissions,
        members,
        auditEntries,
        auditFocus,
        integrationsPath,
      }),
    [
      settings,
      permissions,
      members,
      auditEntries,
      auditFocus,
      integrationsPath,
    ],
  );
  const toggles: { key: keyof SocialHubSettings; label: string }[] = [
    { key: "inboxEnabled", label: "Sosyal gelen kutusu" },
    { key: "publishingEnabled", label: "Yayınlama" },
    { key: "dispatcherCanReply", label: "Dispatcher yanıt" },
    { key: "dispatcherCanPublish", label: "Dispatcher yayın" },
    { key: "ownerApprovalRequired", label: "Yayın için sahip onayı" },
  ];

  return (
    <section className="social-hub-connections-shell module-panel module-panel--elevated">
      <div className="social-hub-connections-layout social-hub-connections-layout--team">
        <div className="social-hub-connections-main social-hub-team-main">
          <header className="social-hub-team-toolbar">
            <div className="social-hub-team-toolbar-copy">
              <h2 className="account-card-title">Ekip &amp; izinler</h2>
              <p className="social-hub-connections-lead social-hub-connections-lead--compact">
                {canManage
                  ? teamPanelLead(members.length, kvkkAccepted)
                  : "Bu sayfa yalnızca yetkili kullanıcılar içindir."}
              </p>
            </div>
            {canManage ? (
              <div className="social-hub-team-toolbar-actions">
                <div className="social-hub-stat-chips">
                  <span className="social-hub-stat-chip social-hub-stat-chip--ok">
                    {members.length} üye
                  </span>
                  <span
                    className={
                      kvkkAccepted
                        ? "social-hub-stat-chip social-hub-stat-chip--ok"
                        : "social-hub-stat-chip social-hub-stat-chip--warn"
                    }
                  >
                    {kvkkAccepted ? "KVKK onaylı" : "KVKK bekliyor"}
                  </span>
                  <span className="social-hub-stat-chip">
                    {auditEntries.length} kayıt
                  </span>
                </div>
                <Link className="btn-account-ghost" href={integrationsPath}>
                  Uygulamalar
                </Link>
              </div>
            ) : null}
          </header>

          {!canManage ? (
            <p className="social-hub-connection-summary">
              Firma sahibi veya sosyal yönetici ile giriş yapın — ayrıntı operasyon
              günlüğünde.
            </p>
          ) : (
            <>
              <div className="social-hub-team-columns">
                <section className="social-hub-team-panel" aria-label="Ekip">
                  <h3 className="social-hub-team-panel-title">Ekip</h3>
                  {members.length > 0 ? (
                    <div className="social-hub-team-table-wrap">
                      <table className="social-hub-team-table">
                        <thead>
                          <tr>
                            <th scope="col">Üye</th>
                            <th scope="col">E-posta</th>
                            <th scope="col">Rol</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((member) => (
                            <tr key={member.membershipId}>
                              <td className="social-hub-team-table-name">
                                {member.displayName || member.emailAddress}
                              </td>
                              <td className="social-hub-team-table-email">
                                {member.emailAddress}
                              </td>
                              <td className="social-hub-team-table-role">
                                {member.roleCode === "COMPANY_OWNER" ||
                                member.isSelf ? (
                                  <span className="social-hub-status-badge social-hub-status-badge--muted">
                                    {memberCardSummary(member)}
                                  </span>
                                ) : (
                                  <select
                                    className="input-light social-hub-team-role-select"
                                    disabled={busy}
                                    value={member.roleCode}
                                    onChange={(e) =>
                                      onRoleChange(member.userId, e.target.value)
                                    }
                                    aria-label={`${member.displayName || member.emailAddress} rolü`}
                                  >
                                    {assignableRoleCodes.map((code) => (
                                      <option key={code} value={code}>
                                        {SOCIAL_ROLE_LABELS[code] ?? code}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="social-hub-connection-summary">
                      Ekip üyesi bulunamadı.
                    </p>
                  )}
                </section>

                <section
                  className="social-hub-team-panel"
                  aria-label="Firma ayarları"
                >
                  <h3 className="social-hub-team-panel-title">Firma ayarları</h3>
                  <div className="social-hub-team-toggle-grid">
                    {toggles.map((row) => (
                      <label
                        key={row.key}
                        className="social-hub-team-toggle-card"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(settings[row.key])}
                          disabled={busy}
                          onChange={(e) =>
                            onPatchSettings({ [row.key]: e.target.checked })
                          }
                        />
                        <span>{row.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="social-hub-team-kvkk-row">
                    {!kvkkAccepted ? (
                      <button
                        type="button"
                        className="btn-account-primary"
                        disabled={busy}
                        onClick={() => onPatchSettings({ acceptKvkk: true })}
                      >
                        KVKK onayı ver
                      </button>
                    ) : (
                      <span className="social-hub-team-kvkk-ok">
                        KVKK onayı tamam
                      </span>
                    )}
                  </div>
                  {permissions.canManageSettings ? (
                    <label className="label-light social-hub-campaign-landing-field">
                      Kampanya landing URL
                      <input
                        className="input-light"
                        type="url"
                        placeholder="https://lerta.com.tr/…"
                        disabled={busy}
                        defaultValue={settings.campaignLandingUrl ?? ""}
                        key={settings.campaignLandingUrl ?? "empty"}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (value === (settings.campaignLandingUrl ?? "")) {
                            return;
                          }
                          onPatchSettings({
                            campaignLandingUrl: value.length > 0 ? value : null,
                          });
                        }}
                      />
                      <span className="module-hint">
                        Yayında utm_campaign olan gönderilere UTM’li 🔗 satırı
                        eklenir (metinde yoksa).
                      </span>
                    </label>
                  ) : null}
                </section>
              </div>

              <div className="social-hub-team-audit-toolbar">
                <div className="social-hub-team-audit-copy">
                  <h3 className="social-hub-team-panel-title">Denetim</h3>
                  <p className="social-hub-team-audit-hint">
                    Detaylar operasyon günlüğünde · CSV dışa aktarma
                  </p>
                </div>
                <div
                  className="social-hub-team-audit-actions"
                  role="group"
                  aria-label="Denetim filtresi"
                >
                  <button
                    type="button"
                    className={
                      auditFocus === "all"
                        ? "btn-account-primary"
                        : "btn-account-ghost"
                    }
                    disabled={busy}
                    onClick={() => onAuditFocusChange("all")}
                  >
                    Tümü
                  </button>
                  <button
                    type="button"
                    className={
                      auditFocus === "webhook"
                        ? "btn-account-primary"
                        : "btn-account-ghost"
                    }
                    disabled={busy}
                    onClick={() => onAuditFocusChange("webhook")}
                  >
                    Webhook
                  </button>
                  <button
                    type="button"
                    className="btn-account-ghost"
                    disabled={busy}
                    onClick={onExportAuditLog}
                  >
                    CSV
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <SocialHubOpsLogRail entries={opsLogEntries} />
      </div>
    </section>
  );
}

function healthOverallLabel(status: SocialHubHealth["overallStatus"]): string {
  switch (status) {
    case "healthy":
      return "Sağlıklı";
    case "attention":
      return "Dikkat gerekli";
    case "critical":
      return "Kritik";
    default:
      return status;
  }
}

export type SocialDeliveryLogFilters = {
  platformCode: string;
  status: "" | "ok" | "failed";
  since: string;
  until: string;
};

type HealthPanelProps = {
  health: SocialHubHealth | null;
  notificationInsights: SocialHubNotificationInsights | null;
  deliveries: SocialHubOutboundDelivery[];
  deliveryFilters: SocialDeliveryLogFilters;
  busy: boolean;
  canManage: boolean;
  healthAlertsEnabled: boolean;
  healthAlertMinSeverity: "attention" | "critical";
  healthAlertFailureThreshold: number;
  healthAlertPlatformThresholdsJson: string;
  onDeliveryFiltersChange: (patch: Partial<SocialDeliveryLogFilters>) => void;
  onApplyDeliveryFilters: () => void;
  onExportDeliveries: () => void;
  onToggleHealthAlerts: (enabled: boolean) => void;
  onSaveAlertThresholds: () => void;
  onAlertThresholdPatch: (patch: {
    healthAlertMinSeverity?: "attention" | "critical";
    healthAlertFailureThreshold?: number;
    healthAlertPlatformThresholdsJson?: string;
  }) => void;
  socialSlackWebhookUrl: string;
  socialSlackUseMessagingFallback: boolean;
  socialSlackNotifyOutboundFailures: boolean;
  socialSlackOutboundFailureCooldownMinutes: number;
  socialSlackDailyDigestEnabled: boolean;
  socialSlackDailyDigestLastSentAt: string | null;
  socialSlackDigestBusinessHoursOnly: boolean;
  socialSlackDigestTimezone: string;
  socialSlackDigestHourStart: number;
  socialSlackDigestHourEnd: number;
  onSlackSettingsPatch: (patch: {
    socialSlackWebhookUrl?: string;
    socialSlackUseMessagingFallback?: boolean;
    socialSlackNotifyOutboundFailures?: boolean;
    socialSlackOutboundFailureCooldownMinutes?: number;
    socialSlackDailyDigestEnabled?: boolean;
    socialSlackDigestBusinessHoursOnly?: boolean;
    socialSlackDigestTimezone?: string;
    socialSlackDigestHourStart?: number;
    socialSlackDigestHourEnd?: number;
  }) => void;
  onSaveSlackSettings: () => void;
  onTestSlack: () => void;
  onSendDigestNow: () => void;
  healthAlertSlackCooldownMinutes: number;
  onHealthSlackCooldownChange: (minutes: number) => void;
  onSaveHealthSlackCooldown: () => void;
  socialHubWeeklyEmailEnabled: boolean;
  onToggleWeeklyEmail: (enabled: boolean) => void;
  onSendWeeklyEmailNow: () => void;
  onExportInsights: () => void;
  onExportWebhookActivity: () => void;
  onRefreshToken: (platformCode: string) => void;
  onReload: () => void;
  pwa?: SocialHubPwaConfig;
  pwaSectionExpanded?: boolean;
  healthPushHookStatus?: string;
};

export function SocialHealthPanel({
  health,
  notificationInsights,
  deliveries,
  deliveryFilters,
  busy,
  canManage,
  healthAlertsEnabled,
  healthAlertMinSeverity,
  healthAlertFailureThreshold,
  healthAlertPlatformThresholdsJson,
  onDeliveryFiltersChange,
  onApplyDeliveryFilters,
  onExportDeliveries,
  onToggleHealthAlerts,
  onSaveAlertThresholds,
  onAlertThresholdPatch,
  socialSlackWebhookUrl,
  socialSlackUseMessagingFallback,
  socialSlackNotifyOutboundFailures,
  socialSlackOutboundFailureCooldownMinutes,
  socialSlackDailyDigestEnabled,
  socialSlackDailyDigestLastSentAt,
  socialSlackDigestBusinessHoursOnly,
  socialSlackDigestTimezone,
  socialSlackDigestHourStart,
  socialSlackDigestHourEnd,
  onSlackSettingsPatch,
  onSaveSlackSettings,
  onTestSlack,
  onSendDigestNow,
  healthAlertSlackCooldownMinutes,
  onHealthSlackCooldownChange,
  onSaveHealthSlackCooldown,
  socialHubWeeklyEmailEnabled,
  onToggleWeeklyEmail,
  onSendWeeklyEmailNow,
  onExportInsights,
  onExportWebhookActivity,
  onRefreshToken,
  onReload,
  pwa,
  pwaSectionExpanded = false,
  healthPushHookStatus,
}: HealthPanelProps) {
  const opsLogEntries = useMemo(() => {
    if (!health) {
      return [];
    }
    return buildHealthOpsLog({
      health,
      notificationInsights,
      deliveries,
      pwa,
      healthPushHookStatus,
    });
  }, [health, notificationInsights, deliveries, pwa, healthPushHookStatus]);

  if (!health) {
    return (
      <section className="social-hub-panel module-panel module-panel--elevated">
        <p className="module-hint">Sağlık verisi yükleniyor…</p>
      </section>
    );
  }

  return (
    <section className="social-hub-connections-shell module-panel module-panel--elevated">
      <div className="social-hub-connections-layout">
        <div className="social-hub-connections-main social-hub-health-main">
          <header className="social-hub-panel-head social-hub-panel-head--premium">
            <div>
              <h2 className="account-card-title">Bağlantı sağlığı</h2>
              <p className="social-hub-connections-lead">
                Kanal bağlantıları ve gönderim başarısı. Teknik ayrıntılar sağdaki
                operasyon günlüğünde.
              </p>
            </div>
            <button
              type="button"
              className="btn-account-ghost"
              disabled={busy}
              onClick={onReload}
            >
              Yenile
            </button>
          </header>
          <p
            className={`social-hub-health-overall social-hub-health-overall--${health.overallStatus}`}
          >
            Genel durum:{" "}
            <strong>{healthOverallLabel(health.overallStatus)}</strong>
          </p>
          {pwa ? (
            <details
              className="social-hub-pwa-details"
              open={pwaSectionExpanded}
            >
              <summary className="social-hub-health-settings-summary">
                PWA kısayolu (BB) — manifest &amp; push hook
              </summary>
              <p className="social-hub-connection-summary">
                Manifest: <code>{pwa.manifestPath}</code> · scope{" "}
                <code>{pwa.scope}</code>
              </p>
              <p className="module-hint">{pwa.healthPushHook.note}</p>
              {healthPushHookStatus ? (
                <p className="account-save-hint">{healthPushHookStatus}</p>
              ) : null}
            </details>
          ) : null}
          <div className="social-hub-health-quick-actions">
        {canManage ? (
          <label className="social-hub-check">
            <input
              type="checkbox"
              checked={healthAlertsEnabled}
              disabled={busy}
              onChange={(e) => onToggleHealthAlerts(e.target.checked)}
            />
            Sağlık uyarıları (e-posta + Slack)
          </label>
        ) : null}
        {canManage ? (
          <label className="social-hub-check">
            <input
              type="checkbox"
              checked={socialHubWeeklyEmailEnabled}
              disabled={busy}
              onChange={(e) => onToggleWeeklyEmail(e.target.checked)}
            />
            Haftalık e-posta özet (firma sahipleri, 7 günde bir)
          </label>
        ) : null}
        {canManage ? (
          <>
            <button
              type="button"
              className="btn-account-ghost"
              disabled={busy}
              onClick={onSendWeeklyEmailNow}
            >
              Haftalık özet gönder (şimdi)
            </button>
          </>
        ) : null}
          </div>
        {canManage ? (
          <details className="social-hub-health-settings-details">
            <summary className="social-hub-health-settings-summary">
              Bildirim ve eşik ayarları
            </summary>
          <div className="social-hub-alert-thresholds social-hub-slack-settings">
            <label className="social-hub-threshold-field social-hub-threshold-field--wide">
              Slack webhook (sosyal hub)
              <input
                className="input-light"
                type="url"
                placeholder="https://hooks.slack.com/services/…"
                value={socialSlackWebhookUrl}
                disabled={busy}
                onChange={(e) =>
                  onSlackSettingsPatch({ socialSlackWebhookUrl: e.target.value })
                }
              />
            </label>
            <label className="social-hub-check">
              <input
                type="checkbox"
                checked={socialSlackUseMessagingFallback}
                disabled={busy}
                onChange={(e) =>
                  onSlackSettingsPatch({
                    socialSlackUseMessagingFallback: e.target.checked,
                  })
                }
              />
              Özel webhook yoksa Mesajlar Slack köprüsünü kullan
            </label>
            <label className="social-hub-check">
              <input
                type="checkbox"
                checked={socialSlackNotifyOutboundFailures}
                disabled={busy}
                onChange={(e) =>
                  onSlackSettingsPatch({
                    socialSlackNotifyOutboundFailures: e.target.checked,
                  })
                }
              />
              Kanal gönderim hatalarında Slack bildirimi
            </label>
            <label className="social-hub-check">
              <input
                type="checkbox"
                checked={socialSlackDailyDigestEnabled}
                disabled={busy}
                onChange={(e) =>
                  onSlackSettingsPatch({
                    socialSlackDailyDigestEnabled: e.target.checked,
                  })
                }
              />
              Günlük Slack özet (24 saatte bir, bağlı kanallar)
            </label>
            {socialSlackDailyDigestLastSentAt ? (
              <p className="module-hint">
                Son özet:{" "}
                {new Date(socialSlackDailyDigestLastSentAt).toLocaleString("tr-TR")}
              </p>
            ) : null}
            <label className="social-hub-check">
              <input
                type="checkbox"
                checked={socialSlackDigestBusinessHoursOnly}
                disabled={busy}
                onChange={(e) =>
                  onSlackSettingsPatch({
                    socialSlackDigestBusinessHoursOnly: e.target.checked,
                  })
                }
              />
              Otomatik özet yalnızca iş saatleri (manuel özet her zaman)
            </label>
            <label className="social-hub-threshold-field">
              Saat dilimi
              <select
                className="input-light"
                value={socialSlackDigestTimezone}
                disabled={busy}
                onChange={(e) =>
                  onSlackSettingsPatch({ socialSlackDigestTimezone: e.target.value })
                }
              >
                <option value="Europe/Istanbul">Europe/Istanbul</option>
                <option value="Europe/Berlin">Europe/Berlin</option>
                <option value="Europe/London">Europe/London</option>
                <option value="UTC">UTC</option>
              </select>
            </label>
            <label className="social-hub-threshold-field">
              İş saati başlangıç
              <input
                className="input-light"
                type="number"
                min={0}
                max={23}
                value={socialSlackDigestHourStart}
                disabled={busy}
                onChange={(e) =>
                  onSlackSettingsPatch({
                    socialSlackDigestHourStart: Number.parseInt(e.target.value, 10),
                  })
                }
              />
            </label>
            <label className="social-hub-threshold-field">
              İş saati bitiş
              <input
                className="input-light"
                type="number"
                min={0}
                max={23}
                value={socialSlackDigestHourEnd}
                disabled={busy}
                onChange={(e) =>
                  onSlackSettingsPatch({
                    socialSlackDigestHourEnd: Number.parseInt(e.target.value, 10),
                  })
                }
              />
            </label>
            <label className="social-hub-threshold-field">
              Hata bildirimi bekleme (dk / konuşma)
              <input
                className="input-light"
                type="number"
                min={1}
                max={1440}
                value={socialSlackOutboundFailureCooldownMinutes}
                disabled={busy}
                onChange={(e) =>
                  onSlackSettingsPatch({
                    socialSlackOutboundFailureCooldownMinutes: Number.parseInt(
                      e.target.value,
                      10,
                    ),
                  })
                }
              />
            </label>
            <button
              type="button"
              className="btn-account-primary"
              disabled={busy}
              onClick={onSaveSlackSettings}
            >
              Slack ayarlarını kaydet
            </button>
            <button
              type="button"
              className="btn-account-ghost"
              disabled={busy}
              onClick={onTestSlack}
            >
              Slack test mesajı
            </button>
            <button
              type="button"
              className="btn-account-ghost"
              disabled={busy}
              onClick={onSendDigestNow}
            >
              Özet gönder (şimdi)
            </button>
            <label className="social-hub-threshold-field">
              Sağlık Slack tekrar (dk)
              <input
                className="input-light"
                type="number"
                min={15}
                max={10080}
                value={healthAlertSlackCooldownMinutes}
                disabled={busy}
                onChange={(e) =>
                  onHealthSlackCooldownChange(
                    Number.parseInt(e.target.value, 10),
                  )
                }
              />
            </label>
            <button
              type="button"
              className="btn-account-primary"
              disabled={busy}
              onClick={onSaveHealthSlackCooldown}
            >
              Sağlık Slack süresini kaydet
            </button>
          </div>
          <div className="social-hub-alert-thresholds">
            <label className="social-hub-threshold-field">
              Uyarı minimum seviye
              <select
                className="input-light"
                value={healthAlertMinSeverity}
                disabled={busy}
                onChange={(e) =>
                  onAlertThresholdPatch({
                    healthAlertMinSeverity: e.target.value as
                      | "attention"
                      | "critical",
                  })
                }
              >
                <option value="attention">Dikkat ve kritik</option>
                <option value="critical">Yalnızca kritik</option>
              </select>
            </label>
            <label className="social-hub-threshold-field">
              24s hata eşiği (varsayılan)
              <input
                className="input-light"
                type="number"
                min={1}
                max={100}
                value={healthAlertFailureThreshold}
                disabled={busy}
                onChange={(e) =>
                  onAlertThresholdPatch({
                    healthAlertFailureThreshold: Number.parseInt(
                      e.target.value,
                      10,
                    ),
                  })
                }
              />
            </label>
            <label className="social-hub-threshold-field social-hub-threshold-field--wide">
              Kanal bazlı eşik (JSON) — TIKTOK, YOUTUBE ve yol haritası kodları
              <input
                className="input-light"
                type="text"
                placeholder='{"WHATSAPP_CLOUD":3,"TIKTOK":2,"YOUTUBE":2}'
                value={healthAlertPlatformThresholdsJson}
                disabled={busy}
                onChange={(e) =>
                  onAlertThresholdPatch({
                    healthAlertPlatformThresholdsJson: e.target.value,
                  })
                }
              />
            </label>
            <button
              type="button"
              className="btn-account-primary"
              disabled={busy}
              onClick={onSaveAlertThresholds}
            >
              Eşikleri kaydet
            </button>
          </div>
          </details>
        ) : null}
      {notificationInsights ? (
        <div className="social-hub-health-insights-premium">
          <div className="social-hub-health-insights-head">
            <h3 className="account-card-title">Gönderim özeti</h3>
            <div className="social-hub-stat-chips">
              <span className="social-hub-stat-chip social-hub-stat-chip--ok">
                24s: {notificationInsights.outboundDeliveriesLast24h.ok} başarılı
              </span>
              <span
                className={
                  notificationInsights.outboundDeliveriesLast24h.failed > 0
                    ? "social-hub-stat-chip social-hub-stat-chip--warn"
                    : "social-hub-stat-chip"
                }
              >
                {notificationInsights.outboundDeliveriesLast24h.failed} hatalı
              </span>
            </div>
          </div>
          {notificationInsights.channelOutbound7d.length > 0 ? (
            <div className="social-hub-channel-bars">
              <p className="module-hint">
                7 gün: {notificationInsights.outboundDeliveriesLast7d.ok} başarılı ·{" "}
                {notificationInsights.outboundDeliveriesLast7d.failed} hatalı
              </p>
              {notificationInsights.channelOutbound7d.map((row) => (
                <div key={row.platformCode} className="social-hub-channel-bar-row">
                  <span className="social-hub-channel-bar-label">{row.label}</span>
                  <div
                    className="social-hub-channel-bar-track"
                    role="presentation"
                  >
                    <div
                      className="social-hub-channel-bar-fill"
                      style={{ width: `${row.successRatePercent}%` }}
                    />
                  </div>
                  <span className="social-hub-channel-bar-pct">
                    %{row.successRatePercent}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {notificationInsights.channelOutbound30d.length > 0 ? (
            <div className="social-hub-channel-bars social-hub-channel-bars--30d">
              <p className="module-hint">
                30 gün: {notificationInsights.outboundDeliveriesLast30d.ok} başarılı ·{" "}
                {notificationInsights.outboundDeliveriesLast30d.failed} hatalı
              </p>
              {notificationInsights.channelOutbound30d.map((row) => (
                <div
                  key={`30d-${row.platformCode}`}
                  className="social-hub-channel-bar-row"
                >
                  <span className="social-hub-channel-bar-label">{row.label}</span>
                  <div
                    className="social-hub-channel-bar-track"
                    role="presentation"
                  >
                    <div
                      className="social-hub-channel-bar-fill social-hub-channel-bar-fill--30d"
                      style={{ width: `${row.successRatePercent}%` }}
                    />
                  </div>
                  <span className="social-hub-channel-bar-pct">
                    %{row.successRatePercent}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-account-ghost"
              disabled={busy}
              onClick={onExportInsights}
            >
              Bildirim özetini CSV indir
            </button>
            <button
              type="button"
              className="btn-account-ghost"
              disabled={busy}
              onClick={onExportWebhookActivity}
            >
              Webhook aktivite CSV
            </button>
          </div>
        </div>
      ) : null}
      <h3 className="social-hub-subsection-heading">Kanallar</h3>
      <ul className="social-hub-health-grid social-hub-health-grid--premium">
        {health.channels.map((channel) => (
          <li
            key={channel.platformCode}
            className="social-hub-health-card social-hub-health-card--premium"
          >
            <div className="social-hub-connection-title-row">
              <h3>{channel.label}</h3>
              <span className={connectionStatusBadgeClass(channel.statusCode)}>
                {statusLabel(channel.statusCode)}
              </span>
            </div>
            <p className="social-hub-health-token-chip">
              {healthTokenBadgeLabel(channel.tokenHealth)}
            </p>
            <p className="social-hub-connection-summary">
              {healthChannelUserSummary(channel)}
            </p>
            {canManage && channel.canRefreshToken ? (
              <button
                type="button"
                className="btn-account-primary"
                disabled={busy}
                onClick={() => onRefreshToken(channel.platformCode)}
              >
                Token yenile
              </button>
            ) : null}
          </li>
        ))}
        {(health.roadmapChannels ?? []).map((channel) => (
          <li
            key={`roadmap-${channel.platformCode}`}
            className="social-hub-health-card social-hub-health-card--premium social-hub-health-card--roadmap"
          >
            <div className="social-hub-connection-title-row">
              <h3>{channel.label}</h3>
              <span
                className={
                  channel.isRoadmapBeta
                    ? "social-hub-pill"
                    : "social-hub-pill social-hub-pill--ok"
                }
              >
                {channel.isRoadmapBeta ? "Beta" : "Prod"}
              </span>
            </div>
            <p className="social-hub-health-token-chip">
              {healthTokenBadgeLabel(channel.tokenHealth)}
            </p>
            <p className="social-hub-connection-summary">
              {healthChannelUserSummary(channel)}
            </p>
            {canManage && channel.canRefreshToken ? (
              <button
                type="button"
                className="btn-account-primary"
                disabled={busy}
                onClick={() => onRefreshToken(channel.platformCode)}
              >
                Token yenile
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <header className="social-hub-panel-head social-hub-panel-head--premium">
        <div>
          <h3 className="account-card-title">Gönderim geçmişi</h3>
          <p className="social-hub-connections-lead social-hub-connections-lead--compact">
            Mesajlar’dan kanala giden denemeler — filtreleyin veya dışa aktarın.
          </p>
        </div>
      </header>
      <div className="social-hub-delivery-filters">
        <select
          className="input-light"
          value={deliveryFilters.platformCode}
          onChange={(e) =>
            onDeliveryFiltersChange({ platformCode: e.target.value })
          }
        >
          <option value="">Tüm kanallar</option>
          {health.channels.map((channel) => (
            <option key={channel.platformCode} value={channel.platformCode}>
              {channel.label}
            </option>
          ))}
          {(health.roadmapChannels ?? []).map((channel) => (
            <option key={channel.platformCode} value={channel.platformCode}>
              {channel.label}
              {channel.isRoadmapBeta ? " (beta)" : ""}
            </option>
          ))}
        </select>
        <select
          className="input-light"
          value={deliveryFilters.status}
          onChange={(e) =>
            onDeliveryFiltersChange({
              status: e.target.value as SocialDeliveryLogFilters["status"],
            })
          }
        >
          <option value="">Tüm durumlar</option>
          <option value="ok">Başarılı</option>
          <option value="failed">Hatalı</option>
        </select>
        <input
          className="input-light"
          type="date"
          value={deliveryFilters.since}
          onChange={(e) => onDeliveryFiltersChange({ since: e.target.value })}
        />
        <input
          className="input-light"
          type="date"
          value={deliveryFilters.until}
          onChange={(e) => onDeliveryFiltersChange({ until: e.target.value })}
        />
        <button
          type="button"
          className="btn-account-primary"
          disabled={busy}
          onClick={onApplyDeliveryFilters}
        >
          Filtrele
        </button>
        <button
          type="button"
          className="btn-account-ghost"
          disabled={busy}
          onClick={onExportDeliveries}
        >
          CSV indir
        </button>
      </div>
      <ul className="social-hub-delivery-log">
        {deliveries.length === 0 ? (
          <li className="module-hint">Henüz kayıt yok.</li>
        ) : (
          deliveries.map((row) => (
            <li key={row.id} className="social-hub-delivery-row">
              <time dateTime={row.createdAt}>
                {new Date(row.createdAt).toLocaleString("tr-TR")}
              </time>
              <span className="social-hub-delivery-platform">
                {row.platformLabel}
                {row.threadDisplayLabel ? ` · ${row.threadDisplayLabel}` : ""}
              </span>
              <span
                className={
                  row.status === "ok"
                    ? "social-hub-delivery-status social-hub-delivery-status--ok"
                    : "social-hub-delivery-status social-hub-delivery-status--failed"
                }
              >
                {row.status === "ok" ? "OK" : "Hata"}
              </span>
              {row.bodyTextPreview ? (
                <p className="social-hub-delivery-preview">{row.bodyTextPreview}</p>
              ) : null}
              <Link
                href={
                  row.messagingThreadUrl ??
                  `/messaging?threadId=${encodeURIComponent(row.messageThreadId)}`
                }
                className="social-hub-delivery-thread-link"
              >
                Konuşmayı Mesajlar’da aç
              </Link>
              {row.errorMessage ? (
                <p className="social-hub-delivery-error-hint">
                  Gönderilemedi — ayrıntı operasyon günlüğünde.
                </p>
              ) : null}
            </li>
          ))
        )}
      </ul>
        </div>
        <SocialHubOpsLogRail entries={opsLogEntries} />
      </div>
    </section>
  );
}
