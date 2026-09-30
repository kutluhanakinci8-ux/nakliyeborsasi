"use client";

import Link from "next/link";
import type {
  SocialHubPermissions,
  SocialHubPost,
  SocialHubSettings,
  SocialHubSnapshot,
  SocialHubTemplate,
} from "../../lib/socialHubTypes";

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
  const { permissions, connections, providers } = snapshot;
  return (
    <section className="social-hub-panel module-panel module-panel--elevated">
      <header className="social-hub-panel-head">
        <h2 className="account-card-title">Bağlı hesaplar</h2>
        <p className="account-card-lead">
          Instagram, Facebook Messenger, WhatsApp Business ve LinkedIn bağlantıları.
          OAuth ve webhook adımları sonraki fazda açılacak.
        </p>
      </header>
      <ul className="social-hub-connection-grid">
        {connections.map((row) => {
          const provider = providers.find((p) => p.platformCode === row.platformCode);
          return (
            <li key={row.id} className="social-hub-connection-card">
              <div className="social-hub-connection-main">
                <h3>{row.label}</h3>
                <p className="social-hub-connection-status">
                  {statusLabel(row.statusCode)}
                  {provider?.implementationStatus === "pending" ? (
                    <span className="social-hub-pill">API hazırlanıyor</span>
                  ) : null}
                </p>
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
                      disabled={busy}
                      onClick={() => onConnect(row.platformCode)}
                    >
                      Bağla
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
  const { inboxSummary, permissions, connections, providers } = snapshot;
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
  draftText: string;
  draftPlatforms: string[];
  busy: boolean;
  onDraftText: (value: string) => void;
  onTogglePlatform: (code: string) => void;
  onCreateDraft: () => void;
  onPublish: (postId: string) => void;
  platformOptions: { code: string; label: string }[];
};

export function SocialPublishingPanel({
  posts,
  permissions,
  draftText,
  draftPlatforms,
  busy,
  onDraftText,
  onTogglePlatform,
  onCreateDraft,
  onPublish,
  platformOptions,
}: PublishingProps) {
  return (
    <section className="social-hub-panel module-panel module-panel--elevated">
      <header className="social-hub-panel-head">
        <h2 className="account-card-title">Yayınlar</h2>
        <p className="account-card-lead">
          Taslak oluşturun; gerçek kanal yayını API fazında devreye girecek.
        </p>
      </header>
      {permissions.canPublish ? (
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
      <ul className="social-hub-post-list">
        {posts.length === 0 ? (
          <li className="module-hint">Henüz gönderi yok.</li>
        ) : (
          posts.map((post) => (
            <li key={post.id} className="social-hub-post-item">
              <div>
                <p className="social-hub-post-meta">
                  {post.statusCode} · {post.platformCodes.join(", ")}
                </p>
                <p>{post.bodyText.slice(0, 160)}</p>
                {post.lastErrorMessage ? (
                  <p className="module-hint">{post.lastErrorMessage}</p>
                ) : null}
              </div>
              {permissions.canPublish &&
              (post.statusCode === "DRAFT" || post.statusCode === "SCHEDULED") ? (
                <button
                  type="button"
                  className="btn-account-ghost"
                  disabled={busy}
                  onClick={() => onPublish(post.id)}
                >
                  Yayınla (dene)
                </button>
              ) : null}
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

export function SocialAnalyticsPanel({ snapshot }: { snapshot: SocialHubSnapshot }) {
  return (
    <section className="social-hub-panel module-panel module-panel--elevated">
      <header className="social-hub-panel-head">
        <h2 className="account-card-title">İstatistikler</h2>
        <p className="account-card-lead">
          Kanal bağlandığında erişim, yanıt süresi ve gönderi performansı burada
          toplanacak.
        </p>
      </header>
      <div className="social-hub-stats-grid">
        <div className="social-hub-stat-card">
          <span className="social-hub-stat-value">{snapshot.connections.filter((c) => c.statusCode === "CONNECTED").length}</span>
          <span className="social-hub-stat-label">Bağlı kanal</span>
        </div>
        <div className="social-hub-stat-card">
          <span className="social-hub-stat-value">{snapshot.recentPosts.length}</span>
          <span className="social-hub-stat-label">Son gönderiler</span>
        </div>
        <div className="social-hub-stat-card">
          <span className="social-hub-stat-value">{snapshot.templates.length}</span>
          <span className="social-hub-stat-label">Şablon</span>
        </div>
      </div>
    </section>
  );
}

type TeamProps = {
  settings: SocialHubSettings;
  permissions: SocialHubPermissions;
  busy: boolean;
  onPatchSettings: (patch: Record<string, boolean>) => void;
};

export function SocialTeamPanel({
  settings,
  permissions,
  busy,
  onPatchSettings,
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
          Rol: <code>SOCIAL_ADMIN</code> (yeni) ve <code>COMPANY_OWNER</code> tam yetki.
        </p>
      </header>
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
    </section>
  );
}
