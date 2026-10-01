"use client";

import Link from "next/link";
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
} from "../../lib/socialHubTypes";

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
};

export function SocialConnectionsPanel({
  snapshot,
  busy,
  onConnect,
  onDisconnect,
  onRoadmapInterest,
  onRoadmapConnect,
  onRoadmapDisconnect,
  onRoadmapRefreshToken,
}: ConnectionsProps) {
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
  const integrationWebhooks = snapshot.integrationWebhooks;
  const webhookReadiness = snapshot.integrationWebhookReadiness;
  const opsHints = snapshot.integrationOpsHints;
  const webhookActivity = snapshot.webhookActivity;
  return (
    <section className="social-hub-panel module-panel module-panel--elevated">
      <header className="social-hub-panel-head">
        <h2 className="account-card-title">Bağlı hesaplar</h2>
        <p className="account-card-lead">
          Meta (Instagram, Messenger, WhatsApp) ve LinkedIn OAuth ile bağlanın. Webhook:
          <code>/api/v1/company/social-hub/webhooks/meta</code>. Mesajlar ekranından
          yanıtlar bağlı kanala gider. Genel API anahtarları:{" "}
          <Link href="/hesap/uygulamalar">Uygulamalar / entegrasyonlar</Link>.
        </p>
        {integrationWebhooks ? (
          <ul className="social-hub-webhook-urls module-hint">
            <li>
              Meta / WhatsApp: <code>{integrationWebhooks.meta}</code>
            </li>
            <li>
              TikTok (beta): <code>{integrationWebhooks.tiktok}</code>
              {webhookReadiness?.tiktok ? (
                <span className="module-hint">
                  {" "}
                  — köprü:{" "}
                  {webhookReadiness.tiktok.webhookBridgeEnabled ? "açık" : "kapalı"}
                  , giden:{" "}
                  {webhookReadiness.tiktok.outboundEnabled ? "açık" : "kapalı"}
                  {webhookReadiness.tiktok.signatureOrPushAuthRequired
                    ? " · imza zorunlu"
                    : ""}
                </span>
              ) : null}
            </li>
            <li>
              YouTube (beta, Pub/Sub push):{" "}
              <code>{integrationWebhooks.youtube}</code>
              <span className="module-hint">
                {" "}
                — message.data içinde base64 JSON (kanal kimliği + metin)
              </span>
              {webhookReadiness?.youtube ? (
                <span className="module-hint">
                  {" "}
                  · köprü:{" "}
                  {webhookReadiness.youtube.webhookBridgeEnabled ? "açık" : "kapalı"}
                  , giden:{" "}
                  {webhookReadiness.youtube.outboundEnabled ? "açık" : "kapalı"}
                  {webhookReadiness.youtube.signatureOrPushAuthRequired
                    ? " · push auth zorunlu"
                    : ""}
                </span>
              ) : null}
            </li>
          </ul>
        ) : null}
        {opsHints ? (
          <p className="module-hint">
            Sunucu: webhook denetim kaydı{" "}
            {opsHints.webhookBridgeAuditEnabled ? "açık" : "kapalı"}
            {opsHints.webhookInboundDedupSeconds > 0
              ? ` · gelen dedup ${opsHints.webhookInboundDedupSeconds}s`
              : ""}
            {opsHints.webhookInactivityHealthHintsEnabled
              ? " · sağlık uyarısı: webhook hareketsizliği"
              : ""}
          </p>
        ) : null}
        {webhookActivity ? (
          <p className="module-hint">
            Webhook → Mesajlar (24s):{" "}
            <strong>{webhookActivity.inboundBridged24h}</strong>
            {webhookActivity.lastInboundBridgedAt
              ? ` · son: ${new Date(webhookActivity.lastInboundBridgedAt).toLocaleString("tr-TR")}`
              : ""}
            {(webhookActivity.byPlatform ?? []).length > 0 ? (
              <>
                {" "}
                —{" "}
                {(webhookActivity.byPlatform ?? [])
                  .map((row) => `${row.label}: ${row.inboundBridged24h}`)
                  .join(" · ")}
              </>
            ) : null}
          </p>
        ) : null}
      </header>
      <ul className="social-hub-connection-grid">
        {connections.map((row) => {
          const provider = providers.find((p) => p.platformCode === row.platformCode);
          const caps = row.capabilities ?? provider?.capabilities;
          const capLabels = capabilitySummary(caps);
          const connectLabel =
            row.statusCode === "CONNECTED" ? "Yeniden bağlan" : "Bağla";
          return (
            <li key={row.id} className="social-hub-connection-card">
              <div className="social-hub-connection-main">
                <h3>{row.label}</h3>
                {row.displayName ? (
                  <p className="module-hint">{row.displayName}</p>
                ) : null}
                <p className="social-hub-connection-status">
                  {statusLabel(row.statusCode)}
                  {provider?.implementationStatus === "pending" ||
                  row.oauthReady === false ? (
                    <span className="social-hub-pill">OAuth yapılandırması eksik</span>
                  ) : null}
                </p>
                {capLabels.length > 0 ? (
                  <ul className="social-hub-capability-list">
                    {capLabels.map((label) => (
                      <li key={label} className="social-hub-pill social-hub-pill--muted">
                        {label}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {row.setupWarnings?.map((warning) => (
                  <p key={warning} className="error banner error--light social-hub-setup-warn">
                    {warning}
                  </p>
                ))}
                {row.lastErrorMessage ? (
                  <p className="module-hint">{row.lastErrorMessage}</p>
                ) : null}
              </div>
              <div className="social-hub-connection-actions">
                {permissions.canManageConnections ? (
                  <>
                    <button
                      type="button"
                      className="btn-account-primary"
                      disabled={busy || row.oauthReady === false}
                      onClick={() => onConnect(row.platformCode)}
                    >
                      {connectLabel}
                    </button>
                    <button
                      type="button"
                      className="btn-account-ghost"
                      disabled={
                        busy ||
                        row.statusCode === "DISCONNECTED" ||
                        row.statusCode === "PENDING_OAUTH"
                      }
                      onClick={() => onDisconnect(row.platformCode)}
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
          <h3 className="account-card-title">Yol haritası</h3>
          <p className="account-card-lead">
            Henüz OAuth ile bağlanamayan kanallar — entegrasyon sırası netleştiğinde
            burada açılacak. Öncelik vermek için ilgi bildirin; sıralama planlamasında
            kullanılır.
          </p>
          <ul className="social-hub-connection-grid">
            {roadmapProviders.map((row: SocialHubRoadmapProvider) => (
              <li
                key={row.platformCode}
                className="social-hub-connection-card social-hub-connection-card--roadmap"
              >
                <h3>{row.label}</h3>
                <span className="social-hub-pill">Yakında</span>
                {row.roadmapInterested ? (
                  <span className="social-hub-pill social-hub-pill--interest">
                    İlgi bildirildi
                  </span>
                ) : null}
                <p className="module-hint">{row.roadmapNote}</p>
                {capabilitySummary(row.capabilities).length > 0 ? (
                  <ul className="social-hub-capability-list">
                    {capabilitySummary(row.capabilities).map((label) => (
                      <li
                        key={label}
                        className="social-hub-pill social-hub-pill--muted"
                      >
                        {label}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="module-hint social-hub-roadmap-oauth-hint">
                  Platform OAuth:{" "}
                  {row.oauthEnvConfigured
                    ? "ortam değişkenleri tanımlı (entegrasyon sırada)"
                    : "henüz yapılandırılmadı"}
                </p>
                {row.roadmapConnectionStatusCode ? (
                  <p className="social-hub-connection-status">
                    {statusLabel(row.roadmapConnectionStatusCode)}
                  </p>
                ) : null}
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
                      onRoadmapInterest(row.platformCode, !row.roadmapInterested)
                    }
                  >
                    {row.roadmapInterested ? "İlgiyi kaldır" : "Öncelik ver"}
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
                    {row.label} bağla (beta)
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
              </li>
            ))}
          </ul>
        </>
      ) : null}
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
};

export function SocialInboxPanel({
  snapshot,
  threadsPreview,
  threadsPreviewLoading,
  busy,
  onSync,
  onSeedDemo,
  canSeedDemo,
}: InboxProps) {
  const inboxSummary = snapshot.inboxSummary ?? {
    totalOpenThreads: 0,
    byPlatform: [],
    messagingDeepLink: "/messaging?tab=sohbet&filter=social",
    note: "Sosyal konuşmalar Mesajlar listesinde listelenir.",
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
  return (
    <section className="social-hub-panel module-panel module-panel--elevated">
      <header className="social-hub-panel-head">
        <h2 className="account-card-title">Sosyal gelen kutusu</h2>
        <p className="account-card-lead">{inboxSummary.note}</p>
      </header>
      <p className="social-hub-stat-line">
        Açık konuşmalar: <strong>{inboxSummary.totalOpenThreads}</strong>
        {(inboxSummary.webhookInboundBridged24h ?? 0) > 0 ? (
          <>
            {" "}
            · webhook köprü (24s):{" "}
            <strong>{inboxSummary.webhookInboundBridged24h}</strong>
          </>
        ) : null}
      </p>
      {threadsPreviewLoading ? (
        <p className="module-hint">Son konuşmalar yükleniyor…</p>
      ) : threadsPreview.length > 0 ? (
        <div className="social-hub-inbox-preview">
          <h3 className="social-hub-subsection-title">Son sosyal konuşmalar</h3>
          <ul className="social-hub-inbox-preview-list">
            {threadsPreview.map((row) => (
              <li key={row.threadId} className="social-hub-inbox-preview-row">
                <div className="social-hub-inbox-preview-main">
                  <span className="social-hub-inbox-preview-channel">
                    {row.platformLabel}
                  </span>
                  <strong className="social-hub-inbox-preview-label">
                    {row.displayLabel}
                  </strong>
                  {row.lastMessagePreview ? (
                    <p className="social-hub-inbox-preview-snippet">
                      {row.lastMessagePreview}
                    </p>
                  ) : null}
                  {row.lastMessageAt ? (
                    <time
                      className="module-hint"
                      dateTime={row.lastMessageAt}
                    >
                      {new Date(row.lastMessageAt).toLocaleString("tr-TR")}
                    </time>
                  ) : null}
                </div>
                <div className="social-hub-inbox-preview-actions">
                  {row.unreadCount > 0 ? (
                    <span className="social-hub-inbox-preview-unread">
                      {row.unreadCount} okunmamış
                    </span>
                  ) : null}
                  <Link
                    href={row.messagingDeepLink}
                    className="btn-account-ghost"
                  >
                    Mesajlar&apos;da aç
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="module-hint">
          Henüz sosyal konuşma yok. Kanal bağlayın, webhook bekleyin veya demo
          oluşturun.
        </p>
      )}
      {snapshot.inboxSyncSummary?.channels?.length ? (
        <div className="social-hub-inbox-sync-summary">
          <h3 className="social-hub-subsection-title">Kanal sync & webhook hizası</h3>
          <p className="module-hint">
            Açık konuşma sayısı, son sync denemesi ve 24s webhook köprü — prod ve beta
            kanallar.
          </p>
          <ul className="social-hub-inbox-sync-list">
            {snapshot.inboxSyncSummary.channels.map((row) => (
              <li key={row.platformCode} className="social-hub-inbox-sync-row">
                <div className="social-hub-inbox-sync-head">
                  <strong>{row.label}</strong>
                  <span className="module-hint">
                    {row.openCount} açık · webhook {row.webhookInboundBridged24h}{" "}
                    (24s)
                  </span>
                </div>
                <p className="social-hub-inbox-sync-meta">
                  {row.inboxHistorySync
                    ? "Geçmiş sync destekli"
                    : row.inboxWebhook
                      ? "Webhook gelen kutusu"
                      : "Yayın / özet"}
                  {row.connectionStatusCode
                    ? ` · bağlantı ${row.connectionStatusCode}`
                    : ""}
                </p>
                {row.lastSyncAt ? (
                  <p className="module-hint">
                    Son sync:{" "}
                    {new Date(row.lastSyncAt).toLocaleString("tr-TR")}
                    {row.lastSyncImplementationStatus
                      ? ` (${row.lastSyncImplementationStatus})`
                      : ""}
                  </p>
                ) : (
                  <p className="module-hint">Henüz sync denemesi kaydı yok.</p>
                )}
                {row.lastSyncMessage ? (
                  <p className="social-hub-inbox-sync-message">{row.lastSyncMessage}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <ul className="social-hub-inbox-platforms">
        {inboxSummary.byPlatform.map((row) => {
          const label = platformLabel(row.platformCode);
          return (
            <li key={row.platformCode} className="social-hub-inbox-row">
              <span className="social-hub-inbox-platform">{label}</span>
              {(row.webhookInboundBridged24h ?? 0) > 0 ? (
                <span className="module-hint">
                  webhook {row.webhookInboundBridged24h} (24s)
                </span>
              ) : null}
              <span className="social-hub-inbox-count">{row.openCount} açık</span>
            </li>
          );
        })}
      </ul>
      {!snapshot.settings.kvkkAcceptedAt ? (
        <p className="module-hint">
          Demo veya senkron için önce <strong>Ekip &amp; izinler</strong> sekmesinden
          KVKK onayını verin.
        </p>
      ) : null}
      <div className="social-hub-panel-actions social-hub-panel-actions--stack">
        <Link href={inboxSummary.messagingDeepLink} className="btn-account-primary">
          Mesajlar&apos;a git
        </Link>
        {canSeedDemo && onSeedDemo ? (
          <button
            type="button"
            className="btn-account-ghost"
            disabled={busy || !snapshot.settings.kvkkAcceptedAt}
            onClick={onSeedDemo}
          >
            Demo gelen kutusu oluştur (Instagram + WhatsApp)
          </button>
        ) : null}
        {permissions.canReply ? (
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
        ) : null}
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
  busy: boolean;
  onDraftText: (value: string) => void;
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
};

export function SocialPublishingPanel({
  posts,
  permissions,
  ownerApprovalRequired,
  draftText,
  draftPlatforms,
  draftMedia,
  busy,
  onDraftText,
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
}: PublishingProps) {
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
    <section className="social-hub-panel module-panel module-panel--elevated">
      <header className="social-hub-panel-head">
        <h2 className="account-card-title">Yayınlar</h2>
        <p className="account-card-lead">
          Taslak, onay, zamanlama ve Meta Graph yayını (metin + görsel). Zamanı gelen
          gönderiler sunucuda otomatik denenir; sonuç mesajı burada görünür.
        </p>
      </header>
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
        <div className="social-hub-compose">
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
        <p className="module-hint">Yayınlama yetkiniz yok (rol / firma ayarı).</p>
      )}
      {ownerApprovalRequired ? (
        <p className="module-hint">
          Firma ayarı: yayınlar için sahip / sosyal yönetici onayı gerekli.
        </p>
      ) : null}
      <ul className="social-hub-post-list">
        {posts.length === 0 ? (
          <li className="module-hint">Henüz gönderi yok.</li>
        ) : (
          posts.map((post) => (
            <li key={post.id} className="social-hub-post-item">
              <div className="social-hub-post-body">
                <p className="social-hub-post-meta">
                  {postStatusLabel(post.statusCode)} · {post.platformCodes.join(", ")}
                  {post.scheduledAt ? (
                    <> · {formatSchedule(post.scheduledAt)}</>
                  ) : null}
                </p>
                <p>{post.bodyText.slice(0, 200)}</p>
                {post.mediaUrls?.length ? (
                  <p className="module-hint">
                    {post.mediaUrls.length} medya dosyası ekli
                  </p>
                ) : null}
                {post.lastErrorMessage ? (
                  <p className="social-hub-publish-error">{post.lastErrorMessage}</p>
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
          ))
        )}
      </ul>
    </section>
  );
}

type TemplatesProps = {
  templates: SocialHubTemplate[];
  permissions: SocialHubPermissions;
  title: string;
  body: string;
  busy: boolean;
  onTitle: (v: string) => void;
  onBody: (v: string) => void;
  onSave: () => void;
};

export function SocialTemplatesPanel({
  templates,
  permissions,
  title,
  body,
  busy,
  onTitle,
  onBody,
  onSave,
}: TemplatesProps) {
  return (
    <section className="social-hub-panel module-panel module-panel--elevated">
      <header className="social-hub-panel-head">
        <h2 className="account-card-title">Hazır yanıtlar</h2>
        <p className="account-card-lead">
          DM ve yorumlarda kullanılacak şablonlar (Mesajlar ile paylaşılacak).
        </p>
      </header>
      {permissions.canManageTemplates ? (
        <div className="social-hub-compose">
          <label className="label-light">
            Başlık
            <input className="input-light" value={title} onChange={(e) => onTitle(e.target.value)} />
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
      <ul className="social-hub-template-list">
        {templates.map((t) => (
          <li key={t.id}>
            <strong>{t.title}</strong>
            <p>{t.bodyText}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

type AnalyticsProps = {
  snapshot: SocialHubSnapshot;
  analytics: SocialHubAnalytics | null;
  loading: boolean;
  busy?: boolean;
  onExportAnalytics?: () => void;
};

export function SocialAnalyticsPanel({
  snapshot,
  analytics,
  loading,
  busy = false,
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
    </section>
  );
}

const SOCIAL_ROLE_LABELS: Record<string, string> = {
  SOCIAL_ADMIN: "Sosyal yönetici",
  DISPATCHER: "Dispatcher",
  VIEWER: "Görüntüleme",
  COMPANY_OWNER: "Firma sahibi",
};

function auditActionLabel(code: string): string {
  const map: Record<string, string> = {
    SOCIAL_HUB_SETTINGS_UPDATE: "Ayar güncelleme",
    SOCIAL_HUB_POST_PUBLISH: "Yayın denemesi",
    SOCIAL_HUB_POST_APPROVE: "Gönderi onayı",
    SOCIAL_HUB_POST_SUBMIT_APPROVAL: "Onaya gönderim",
    SOCIAL_HUB_MEMBER_ROLE_UPDATE: "Rol değişikliği",
    SOCIAL_HUB_WEBHOOK_INBOUND_BRIDGED: "Webhook → Mesajlar köprüsü",
    SOCIAL_HUB_ROADMAP_INBOX_SYNC: "Beta gelen kutusu özet",
    SOCIAL_HUB_INBOX_SYNC: "Gelen kutusu senkron",
  };
  return map[code] ?? code;
}

type TeamProps = {
  settings: SocialHubSettings;
  permissions: SocialHubPermissions;
  members: SocialHubTeamMember[];
  assignableRoleCodes: string[];
  auditEntries: SocialHubAuditEntry[];
  auditFocus: "all" | "webhook";
  integrationsPath: string;
  busy: boolean;
  onPatchSettings: (patch: Record<string, boolean>) => void;
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
  if (!permissions.canManageSettings) {
    return (
      <section className="social-hub-panel module-panel module-panel--elevated">
        <p className="module-hint">Ekip ve izin ayarları yalnızca firma sahibi / sosyal yönetici.</p>
      </section>
    );
  }
  const toggles: { key: keyof SocialHubSettings; label: string }[] = [
    { key: "inboxEnabled", label: "Sosyal gelen kutusu açık" },
    { key: "publishingEnabled", label: "Yayınlama açık" },
    { key: "dispatcherCanReply", label: "Dispatcher yanıtlayabilir" },
    { key: "dispatcherCanPublish", label: "Dispatcher yayınlayabilir" },
    { key: "ownerApprovalRequired", label: "Yayın için sahip onayı" },
  ];
  return (
    <section className="social-hub-panel module-panel module-panel--elevated">
      <header className="social-hub-panel-head">
        <h2 className="account-card-title">Ekip & izinler</h2>
        <p className="account-card-lead">
          <code>SOCIAL_ADMIN</code> sosyal hub yönetimi; <code>COMPANY_OWNER</code> tam yetki.
          Entegrasyon API: <Link href={integrationsPath}>Uygulamalar</Link>.
        </p>
      </header>
      {members.length > 0 ? (
        <ul className="social-hub-team-list">
          {members.map((member) => (
            <li key={member.membershipId} className="social-hub-team-row">
              <div>
                <strong>{member.displayName || member.emailAddress}</strong>
                <p className="social-hub-post-meta">{member.emailAddress}</p>
              </div>
              {member.roleCode === "COMPANY_OWNER" || member.isSelf ? (
                <span className="social-hub-pill">
                  {SOCIAL_ROLE_LABELS[member.roleCode] ?? member.roleCode}
                </span>
              ) : (
                <select
                  className="input-light"
                  disabled={busy}
                  value={member.roleCode}
                  onChange={(e) => onRoleChange(member.userId, e.target.value)}
                >
                  {assignableRoleCodes.map((code) => (
                    <option key={code} value={code}>
                      {SOCIAL_ROLE_LABELS[code] ?? code}
                    </option>
                  ))}
                </select>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="module-hint">Ekip üyesi bulunamadı.</p>
      )}
      <ul className="social-hub-settings-list">
        {toggles.map((row) => (
          <li key={row.key}>
            <label className="social-hub-check">
              <input
                type="checkbox"
                checked={Boolean(settings[row.key])}
                disabled={busy}
                onChange={(e) => onPatchSettings({ [row.key]: e.target.checked })}
              />
              {row.label}
            </label>
          </li>
        ))}
      </ul>
      {!settings.kvkkAcceptedAt ? (
        <button
          type="button"
          className="btn-account-primary"
          disabled={busy}
          onClick={() => onPatchSettings({ acceptKvkk: true })}
        >
          KVKK / kanal kullanım onayı
        </button>
      ) : (
        <p className="module-hint">
          KVKK onayı: {new Date(settings.kvkkAcceptedAt).toLocaleString("tr-TR")}
        </p>
      )}
      <h3 className="social-hub-calendar-title">Son işlemler (denetim)</h3>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        <button
          type="button"
          className={auditFocus === "all" ? "btn-account-primary" : "btn-account-ghost"}
          disabled={busy}
          onClick={() => onAuditFocusChange("all")}
        >
          Tümü
        </button>
        <button
          type="button"
          className={
            auditFocus === "webhook" ? "btn-account-primary" : "btn-account-ghost"
          }
          disabled={busy}
          onClick={() => onAuditFocusChange("webhook")}
        >
          Webhook köprü
        </button>
        <button
          type="button"
          className="btn-account-ghost"
          disabled={busy}
          onClick={onExportAuditLog}
        >
          Denetim CSV
        </button>
      </div>
      <ul className="social-hub-audit-list">
        {auditEntries.length === 0 ? (
          <li className="module-hint">Henüz kayıt yok.</li>
        ) : (
          auditEntries.map((entry) => (
            <li key={entry.id}>
              <time dateTime={entry.createdAt}>
                {new Date(entry.createdAt).toLocaleString("tr-TR")}
              </time>
              <span>{auditActionLabel(entry.actionCode)}</span>
              {entry.actionCode === "SOCIAL_HUB_WEBHOOK_INBOUND_BRIDGED" &&
              entry.metadata &&
              typeof entry.metadata.platformCode === "string" ? (
                <span className="module-hint"> ({entry.metadata.platformCode})</span>
              ) : null}
            </li>
          ))
        )}
      </ul>
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

function tokenHealthLabel(
  code: SocialHubHealth["channels"][number]["tokenHealth"],
): string {
  switch (code) {
    case "ok":
      return "Token OK";
    case "expiring_soon":
      return "Token süresi yakın";
    case "expired":
      return "Token süresi doldu";
    case "missing":
      return "Bağlı değil";
    default:
      return code;
  }
}

export type SocialDeliveryLogFilters = {
  platformCode: string;
  status: "" | "ok" | "failed";
  since: string;
  until: string;
};

function formatInsightTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleString("tr-TR");
}

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
}: HealthPanelProps) {
  if (!health) {
    return (
      <section className="social-hub-panel module-panel module-panel--elevated">
        <p className="module-hint">Sağlık verisi yükleniyor…</p>
      </section>
    );
  }
  return (
    <section className="social-hub-panel module-panel module-panel--elevated">
      <header className="social-hub-panel-head">
        <h2 className="account-card-title">Bağlantı sağlığı</h2>
        <p className="account-card-lead">
          Token durumu, kurulum uyarıları ve son 24 saatteki kanal gönderim hataları.
          Kritik durumda firma sahiplerine e-posta gider; Slack için aşağıdaki
          sosyal hub webhook veya (isteğe bağlı) Mesajlar köprüsü kullanılır.
        </p>
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
            {notificationInsights &&
            notificationInsights.manualNotifyCooldownMinutes > 0 ? (
              <p className="module-hint">
                Manuel Slack özet ve haftalık e-posta için{" "}
                {notificationInsights.manualNotifyCooldownMinutes} dakikalık
                bekleme uygulanır.
              </p>
            ) : null}
          </>
        ) : null}
        {canManage ? (
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
        ) : null}
        {canManage ? (
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
              Kanal bazlı eşik (JSON) — TIKTOK / YOUTUBE beta kodları desteklenir
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
        ) : null}
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
        Genel durum: <strong>{healthOverallLabel(health.overallStatus)}</strong>
      </p>
      {notificationInsights ? (
        <div className="social-hub-notification-insights">
          <h3 className="account-card-title">Bildirim özeti</h3>
          <p className="module-hint">
            24s gönderim: {notificationInsights.outboundDeliveriesLast24h.ok}{" "}
            başarılı · {notificationInsights.outboundDeliveriesLast24h.failed} hatalı
            {(notificationInsights.webhookInboundBridged24h ?? 0) > 0 ? (
              <>
                {" "}
                · webhook köprü: {notificationInsights.webhookInboundBridged24h}
                {(notificationInsights.webhookInboundBridgedByPlatform24h ?? [])
                  .length > 0
                  ? ` (${(notificationInsights.webhookInboundBridgedByPlatform24h ?? [])
                      .map((row) => `${row.label}: ${row.inboundBridged24h}`)
                      .join(", ")})`
                  : ""}
              </>
            ) : null}
          </p>
          <ul className="social-hub-insights-list">
            <li>
              E-posta sağlık uyarısı:{" "}
              {formatInsightTime(notificationInsights.healthAlertEmailLastSentAt)}
              {notificationInsights.lastHealthAlertStatus
                ? ` (${notificationInsights.lastHealthAlertStatus})`
                : ""}
            </li>
            <li>
              Slack günlük özet:{" "}
              {formatInsightTime(notificationInsights.slackDailyDigestLastSentAt)}
            </li>
            <li>
              Slack sağlık uyarısı:{" "}
              {formatInsightTime(notificationInsights.slackHealthAlertLastSentAt)}
            </li>
            <li>
              Slack gönderim hatası:{" "}
              {formatInsightTime(notificationInsights.slackOutboundFailureLastSentAt)}
            </li>
            <li>
              Haftalık e-posta özet:{" "}
              {formatInsightTime(notificationInsights.weeklyEmailLastSentAt)}
            </li>
            {notificationInsights.roadmapInterestLabels.length > 0 ? (
              <li>
                Yol haritası önceliği:{" "}
                {notificationInsights.roadmapInterestLabels.join(", ")}
              </li>
            ) : null}
          </ul>
          {notificationInsights.channelOutbound24h.length > 0 ? (
            <ul className="social-hub-channel-rates">
              {notificationInsights.channelOutbound24h.map((row) => (
                <li key={row.platformCode}>
                  24s · {row.label}: %{row.successRatePercent} ({row.ok}/
                  {row.ok + row.failed})
                </li>
              ))}
            </ul>
          ) : null}
          {(notificationInsights.roadmapBetaOutbound24h ?? []).length > 0 ? (
            <p className="module-hint">
              Beta kanallar (24s):{" "}
              {(notificationInsights.roadmapBetaOutbound24h ?? [])
                .map(
                  (row) =>
                    `${row.label} %${row.successRatePercent} (${row.ok}/${row.ok + row.failed})`,
                )
                .join(" · ")}
            </p>
          ) : null}
          {(notificationInsights.roadmapBetaChannelHealth ?? []).some(
            (row) => row.statusCode === "CONNECTED",
          ) ? (
            <ul className="social-hub-insights-list">
              {(notificationInsights.roadmapBetaChannelHealth ?? [])
                .filter((row) => row.statusCode === "CONNECTED")
                .map((row) => (
                  <li key={row.platformCode}>
                    {row.label} (beta): {row.openThreadCount} açık konuşma ·{" "}
                    {row.recentOutboundFailures24h} giden hata (24s) · webhook{" "}
                    {row.webhookInboundBridged24h ?? 0} (24s)
                  </li>
                ))}
            </ul>
          ) : null}
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
      <ul className="social-hub-health-grid">
        {health.channels.map((channel) => (
          <li key={channel.platformCode} className="social-hub-health-card">
            <h3>{channel.label}</h3>
            <p className="social-hub-health-meta">
              {statusLabel(channel.statusCode)} · {tokenHealthLabel(channel.tokenHealth)}
            </p>
            <p className="module-hint">
              Açık konuşma: {channel.openThreadCount} · 24s hata:{" "}
              {channel.recentOutboundFailures24h}
              {channel.inboxWebhookCapable ? (
                <>
                  {" "}
                  · webhook köprü (24s): {channel.webhookInboundBridged24h ?? 0}
                </>
              ) : null}
            </p>
            {channel.setupWarnings.map((warning) => (
              <p key={warning} className="social-hub-setup-warn">{warning}</p>
            ))}
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
            className="social-hub-health-card social-hub-health-card--roadmap"
          >
            <h3>{channel.label}</h3>
            <span className="social-hub-pill">Beta yol haritası</span>
            <p className="social-hub-health-meta">
              {statusLabel(channel.statusCode)} · {tokenHealthLabel(channel.tokenHealth)}
            </p>
            <p className="module-hint">
              Açık konuşma: {channel.openThreadCount} · 24s hata:{" "}
              {channel.recentOutboundFailures24h}
              {channel.inboxWebhookCapable ? (
                <>
                  {" "}
                  · webhook köprü (24s): {channel.webhookInboundBridged24h ?? 0}
                </>
              ) : null}
            </p>
            {channel.setupWarnings.map((warning) => (
              <p key={warning} className="social-hub-setup-warn">{warning}</p>
            ))}
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
      <header className="social-hub-panel-head">
        <h3 className="account-card-title">Gönderim geçmişi</h3>
        <p className="account-card-lead">
          Mesajlar’dan kanala giden metin denemeleri — filtreleyin veya CSV indirin.
        </p>
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
              {channel.label} (beta)
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
                <p className="social-hub-delivery-error">{row.errorMessage}</p>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
