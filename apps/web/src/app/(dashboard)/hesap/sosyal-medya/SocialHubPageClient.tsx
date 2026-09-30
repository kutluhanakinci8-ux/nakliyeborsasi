"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  SocialAnalyticsPanel,
  SocialConnectionsPanel,
  SocialInboxPanel,
  SocialPublishingPanel,
  SocialTeamPanel,
  SocialTemplatesPanel,
} from "../../../../components/social/SocialHubPanels";
import {
  SocialHubSectionNav,
  type SocialHubTabId,
} from "../../../../components/social/SocialHubSectionNav";
import { useWebSession } from "../../../../context/WebSessionProvider";
import { SocialHubApiClient } from "../../../../lib/SocialHubApiClient";
import type {
  SocialHubAnalytics,
  SocialHubAuditEntry,
  SocialHubSnapshot,
  SocialHubTeamMember,
} from "../../../../lib/socialHubTypes";

export function SocialHubPageClient() {
  const { accessToken, session } = useWebSession();
  const [activeTab, setActiveTab] = useState<SocialHubTabId>("connections");
  const [snapshot, setSnapshot] = useState<SocialHubSnapshot | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftPlatforms, setDraftPlatforms] = useState<string[]>(["INSTAGRAM"]);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [teamMembers, setTeamMembers] = useState<SocialHubTeamMember[]>([]);
  const [assignableRoles, setAssignableRoles] = useState<string[]>([]);
  const [integrationsPath, setIntegrationsPath] = useState("/hesap/uygulamalar");
  const [auditEntries, setAuditEntries] = useState<SocialHubAuditEntry[]>([]);
  const [analytics, setAnalytics] = useState<SocialHubAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);

  const canAccess =
    session?.roleCodes?.some((code) =>
      ["COMPANY_OWNER", "SOCIAL_ADMIN", "DISPATCHER", "VIEWER"].includes(code),
    ) ?? false;

  const reload = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const hub = await SocialHubApiClient.fetchSnapshot(accessToken);
    setSnapshot(hub);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !canAccess) {
      return;
    }
    void reload().catch((err) => {
      const text = err instanceof Error ? err.message : "";
      if (text.includes("SUBSCRIPTION_ENTITLEMENT") || text.includes("subscription")) {
        setSubscriptionBlocked(true);
        setError("");
      } else {
        setError("Sosyal medya hub verisi yüklenemedi.");
      }
    });
  }, [accessToken, canAccess, reload]);

  useEffect(() => {
    if (!accessToken || activeTab !== "analytics" || !snapshot || subscriptionBlocked) {
      return;
    }
    setAnalyticsLoading(true);
    void SocialHubApiClient.fetchAnalytics(accessToken)
      .then(setAnalytics)
      .catch(() => setError("Analitik yüklenemedi."))
      .finally(() => setAnalyticsLoading(false));
  }, [accessToken, activeTab, snapshot, subscriptionBlocked]);

  useEffect(() => {
    if (!accessToken || activeTab !== "team" || !snapshot?.permissions.canManageSettings) {
      return;
    }
    void (async () => {
      try {
        const team = await SocialHubApiClient.fetchTeam(accessToken);
        setTeamMembers(team.members);
        setAssignableRoles(team.assignableRoleCodes);
        setIntegrationsPath(team.integrationsPath);
        const audit = await SocialHubApiClient.fetchAuditLog(accessToken);
        setAuditEntries(audit.entries);
      } catch {
        setError("Ekip verisi yüklenemedi.");
      }
    })();
  }, [accessToken, activeTab, snapshot?.permissions.canManageSettings]);

  async function runAction(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError("");
    try {
      await action();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  }

  const platformOptions =
    snapshot?.providers.map((p) => ({ code: p.platformCode, label: p.label })) ??
    [];

  return (
    <div className="social-hub-page">
      <header className="social-hub-intro">
        <h2 className="social-hub-intro-title">Sosyal medya & kanallar</h2>
        <p className="social-hub-intro-lead">
          Hesap bağlantıları, sosyal gelen kutusu, yayınlar ve ekip izinleri. Harici
          API (Meta, WhatsApp, LinkedIn) sonraki fazda açılacak.
        </p>
      </header>
      <SocialHubSectionNav activeTab={activeTab} onTabChange={setActiveTab} />
        {error ? <p className="error banner error--light">{error}</p> : null}
        {status ? <p className="account-save-hint">{status}</p> : null}
        {!canAccess ? (
          <p className="module-hint">Bu alan için firma rolü gerekli.</p>
        ) : subscriptionBlocked ? (
          <section className="social-hub-panel module-panel module-panel--elevated">
            <h2 className="account-card-title">Sosyal medya modülü</h2>
            <p className="account-card-lead">
              Bu özellik aboneliğinizde <strong>SOCIAL_HUB</strong> modülünü gerektirir.
              Professional veya Enterprise lojistik planlarında yer alır.
            </p>
            <Link href="/hesap/abonelik" className="btn-account-primary">
              Abonelik ve planlar
            </Link>
          </section>
        ) : !snapshot ? (
          <p className="module-hint">Yükleniyor…</p>
        ) : (
          <>
            {activeTab === "connections" ? (
              <SocialConnectionsPanel
                snapshot={snapshot}
                busy={busy}
                onConnect={(code) =>
                  void runAction(async () => {
                    const result = await SocialHubApiClient.connectPlatform(
                      accessToken,
                      code,
                    );
                    setStatus(result.oauth.message);
                  })
                }
                onDisconnect={(code) =>
                  void runAction(async () => {
                    await SocialHubApiClient.disconnectPlatform(accessToken, code);
                    setStatus("Bağlantı kesildi.");
                  })
                }
              />
            ) : null}
            {activeTab === "inbox" ? (
              <SocialInboxPanel
                snapshot={snapshot}
                busy={busy}
                canSeedDemo={snapshot.permissions.canManageConnections}
                onSeedDemo={() =>
                  void runAction(async () => {
                    const result = await SocialHubApiClient.seedDemoInbox(
                      accessToken,
                    );
                    setStatus(
                      `Demo oluşturuldu (${result.createdThreadIds.length} konuşma). Mesajlar sekmesine bakın.`,
                    );
                  })
                }
                onSync={(code) =>
                  void runAction(async () => {
                    const result = await SocialHubApiClient.syncInbox(
                      accessToken,
                      code,
                    );
                    setStatus(result.sync.message);
                  })
                }
              />
            ) : null}
            {activeTab === "publishing" ? (
              <SocialPublishingPanel
                posts={snapshot.recentPosts}
                permissions={snapshot.permissions}
                ownerApprovalRequired={snapshot.settings.ownerApprovalRequired}
                draftText={draftText}
                draftPlatforms={draftPlatforms}
                busy={busy}
                platformOptions={platformOptions}
                onDraftText={setDraftText}
                onTogglePlatform={(code) =>
                  setDraftPlatforms((current) =>
                    current.includes(code)
                      ? current.filter((c) => c !== code)
                      : [...current, code],
                  )
                }
                onCreateDraft={() =>
                  void runAction(async () => {
                    await SocialHubApiClient.createPost(accessToken, {
                      bodyText: draftText,
                      platformCodes: draftPlatforms,
                    });
                    setDraftText("");
                    setStatus("Taslak kaydedildi.");
                  })
                }
                onSchedule={(postId, scheduledAt) =>
                  void runAction(async () => {
                    await SocialHubApiClient.updatePost(accessToken, postId, {
                      scheduledAt,
                    });
                    setStatus(
                      scheduledAt
                        ? "Yayın zamanlandı."
                        : "Zamanlama kaldırıldı.",
                    );
                  })
                }
                onSubmitApproval={(postId) =>
                  void runAction(async () => {
                    await SocialHubApiClient.submitPostForApproval(
                      accessToken,
                      postId,
                    );
                    setStatus("Onaya gönderildi.");
                  })
                }
                onApprove={(postId) =>
                  void runAction(async () => {
                    await SocialHubApiClient.approvePost(accessToken, postId);
                    setStatus("Gönderi onaylandı.");
                  })
                }
                onCancel={(postId) =>
                  void runAction(async () => {
                    await SocialHubApiClient.cancelPost(accessToken, postId);
                    setStatus("Gönderi iptal edildi.");
                  })
                }
                onDelete={(postId) =>
                  void runAction(async () => {
                    await SocialHubApiClient.deletePost(accessToken, postId);
                    setStatus("Gönderi silindi.");
                  })
                }
                onPublish={(postId) =>
                  void runAction(async () => {
                    const result = await SocialHubApiClient.publishPost(
                      accessToken,
                      postId,
                    );
                    setStatus(
                      result.providerMessage ??
                        "Yayın denemesi tamamlandı (API fazı bekleniyor).",
                    );
                  })
                }
              />
            ) : null}
            {activeTab === "templates" ? (
              <SocialTemplatesPanel
                templates={snapshot.templates}
                permissions={snapshot.permissions}
                title={templateTitle}
                body={templateBody}
                busy={busy}
                onTitle={setTemplateTitle}
                onBody={setTemplateBody}
                onSave={() =>
                  void runAction(async () => {
                    await SocialHubApiClient.createTemplate(accessToken, {
                      title: templateTitle,
                      bodyText: templateBody,
                    });
                    setTemplateTitle("");
                    setTemplateBody("");
                    setStatus("Şablon eklendi.");
                  })
                }
              />
            ) : null}
            {activeTab === "analytics" ? (
              <SocialAnalyticsPanel
                snapshot={snapshot}
                analytics={analytics}
                loading={analyticsLoading}
              />
            ) : null}
            {activeTab === "team" ? (
              <SocialTeamPanel
                settings={snapshot.settings}
                permissions={snapshot.permissions}
                members={teamMembers}
                assignableRoleCodes={assignableRoles}
                auditEntries={auditEntries}
                integrationsPath={integrationsPath}
                busy={busy}
                onPatchSettings={(patch) =>
                  void runAction(async () => {
                    await SocialHubApiClient.updateSettings(accessToken, patch);
                    setStatus("Ayarlar güncellendi.");
                  })
                }
                onRoleChange={(userId, roleCode) =>
                  void runAction(async () => {
                    await SocialHubApiClient.updateMemberRole(
                      accessToken,
                      userId,
                      roleCode,
                    );
                    const team = await SocialHubApiClient.fetchTeam(accessToken);
                    setTeamMembers(team.members);
                    const audit = await SocialHubApiClient.fetchAuditLog(accessToken);
                    setAuditEntries(audit.entries);
                    setStatus("Rol güncellendi.");
                  })
                }
              />
            ) : null}
          </>
        )}
    </div>
  );
}
