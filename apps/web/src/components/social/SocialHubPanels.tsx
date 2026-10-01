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
  SocialHubTeamMember,
  SocialHubTemplate,
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
};

export function SocialConnectionsPanel({
  snapshot,
  busy,
  onConnect,
  onDisconnect,
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
    </section>
  );
}

type InboxProps = {
  snapshot: SocialHubSnapshot;
  busy: boolean;
  onSync: (platformCode: string) => void;
  onSeedDemo?: () => void;
  canSeedDemo?: boolean;
};

export function SocialInboxPanel({
  snapshot,
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
  return (
    <section className="social-hub-panel module-panel module-panel--elevated">
      <header className="social-hub-panel-head">
        <h2 className="account-card-title">Sosyal gelen kutusu</h2>
        <p className="account-card-lead">{inboxSummary.note}</p>
      </header>
      <p className="social-hub-stat-line">
        Açık konuşmalar: <strong>{inboxSummary.totalOpenThreads}</strong>
      </p>
      <ul className="social-hub-inbox-platforms">
        {inboxSummary.byPlatform.map((row) => {
          const label =
            providers.find((p) => p.platformCode === row.platformCode)?.label ??
            row.platformCode;
          return (
            <li key={row.platformCode} className="social-hub-inbox-row">
              <span className="social-hub-inbox-platform">{label}</span>
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
            {connections.map((c) => (
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
  busy: boolean;
  onDraftText: (value: string) => void;
  onTogglePlatform: (code: string) => void;
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
  busy,
  onDraftText,
  onTogglePlatform,
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
          Taslak, onay ve zamanlama; kanal API yayını sonraki fazda. Zamanı gelen
          gönderiler sunucuda otomatik denenir.
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
                {post.lastErrorMessage ? (
                  <p className="module-hint">{post.lastErrorMessage}</p>
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
};

export function SocialAnalyticsPanel({
  snapshot,
  analytics,
  loading,
}: AnalyticsProps) {
  const fallbackOpen = snapshot.inboxSummary?.totalOpenThreads ?? 0;
  return (
    <section className="social-hub-panel module-panel module-panel--elevated">
      <header className="social-hub-panel-head">
        <h2 className="account-card-title">İstatistikler</h2>
        <p className="account-card-lead">
          Gönderi durumları, gelen kutusu ve kanal hazırlığı. Harici API metrikleri
          bağlantı fazında eklenecek.
        </p>
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
      </div>
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
  };
  return map[code] ?? code;
}

type TeamProps = {
  settings: SocialHubSettings;
  permissions: SocialHubPermissions;
  members: SocialHubTeamMember[];
  assignableRoleCodes: string[];
  auditEntries: SocialHubAuditEntry[];
  integrationsPath: string;
  busy: boolean;
  onPatchSettings: (patch: Record<string, boolean>) => void;
  onRoleChange: (userId: string, roleCode: string) => void;
};

export function SocialTeamPanel({
  settings,
  permissions,
  members,
  assignableRoleCodes,
  auditEntries,
  integrationsPath,
  busy,
  onPatchSettings,
  onRoleChange,
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
              Kanal bazlı eşik (JSON)
              <input
                className="input-light"
                type="text"
                placeholder='{"WHATSAPP_CLOUD":3,"INSTAGRAM":1}'
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
          </ul>
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
