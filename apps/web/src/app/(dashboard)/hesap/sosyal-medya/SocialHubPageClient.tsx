"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  SocialAnalyticsPanel,
  SocialConnectionsPanel,
  SocialHealthPanel,
  type SocialDeliveryLogFilters,
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
import { readFileAsAttachment } from "../../../../lib/messagingPageHelpers";
import { formatSocialHubOAuthReason } from "../../../../lib/formatSocialHubOAuthReason";
import type {
  SocialHubAnalytics,
  SocialHubAuditEntry,
  SocialHubHealth,
  SocialHubNotificationInsights,
  SocialHubOutboundDelivery,
  SocialHubSnapshot,
  SocialHubTeamMember,
  SocialHubInboxThreadPreview,
} from "../../../../lib/socialHubTypes";

export function SocialHubPageClient() {
  const { accessToken, session } = useWebSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SocialHubTabId>("connections");
  const [snapshot, setSnapshot] = useState<SocialHubSnapshot | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftPlatforms, setDraftPlatforms] = useState<string[]>(["INSTAGRAM"]);
  const [draftMedia, setDraftMedia] = useState<
    Array<{ mediaRef: string; previewUrl: string; filename: string }>
  >([]);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [teamMembers, setTeamMembers] = useState<SocialHubTeamMember[]>([]);
  const [assignableRoles, setAssignableRoles] = useState<string[]>([]);
  const [integrationsPath, setIntegrationsPath] = useState("/hesap/uygulamalar");
  const [auditEntries, setAuditEntries] = useState<SocialHubAuditEntry[]>([]);
  const [auditFocus, setAuditFocus] = useState<"all" | "webhook">("all");
  const [analytics, setAnalytics] = useState<SocialHubAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [inboxThreadsPreview, setInboxThreadsPreview] = useState<
    SocialHubInboxThreadPreview[]
  >([]);
  const [inboxPreviewLoading, setInboxPreviewLoading] = useState(false);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);
  const [health, setHealth] = useState<SocialHubHealth | null>(null);
  const [notificationInsights, setNotificationInsights] =
    useState<SocialHubNotificationInsights | null>(null);
  const [deliveries, setDeliveries] = useState<SocialHubOutboundDelivery[]>([]);
  const [deliveryFilters, setDeliveryFilters] = useState<SocialDeliveryLogFilters>(
    {
      platformCode: "",
      status: "",
      since: "",
      until: "",
    },
  );
  const [alertThresholdDraft, setAlertThresholdDraft] = useState({
    healthAlertMinSeverity: "attention" as "attention" | "critical",
    healthAlertFailureThreshold: 1,
    healthAlertPlatformThresholdsJson: "",
    healthAlertSlackCooldownMinutes: 1440,
  });
  const [slackSettingsDraft, setSlackSettingsDraft] = useState({
    socialSlackWebhookUrl: "",
    socialSlackUseMessagingFallback: true,
    socialSlackNotifyOutboundFailures: false,
    socialSlackOutboundFailureCooldownMinutes: 15,
    socialSlackDailyDigestEnabled: false,
    socialSlackDigestBusinessHoursOnly: false,
    socialSlackDigestTimezone: "Europe/Istanbul",
    socialSlackDigestHourStart: 9,
    socialSlackDigestHourEnd: 18,
  });

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
    setSubscriptionBlocked(false);
  }, [accessToken]);

  useEffect(() => {
    const oauth = searchParams.get("oauth");
    if (oauth === "success") {
      setStatus("Kanal bağlantısı tamamlandı.");
      setActiveTab("connections");
    } else if (oauth === "error") {
      const reason = searchParams.get("reason") ?? "bilinmeyen";
      setError(`OAuth: ${formatSocialHubOAuthReason(reason)}`);
      setActiveTab("connections");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!accessToken || !canAccess) {
      return;
    }
    void reload().catch((err) => {
      setSnapshot(null);
      const text = err instanceof Error ? err.message : "";
      if (text.includes("SUBSCRIPTION_ENTITLEMENT") || text.includes("subscription")) {
        setSubscriptionBlocked(true);
        setError("");
      } else {
        setError("Sosyal medya hub verisi yüklenemedi.");
      }
    });
  }, [accessToken, canAccess, reload]);

  const loadHealthData = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const sinceIso = deliveryFilters.since
      ? new Date(`${deliveryFilters.since}T00:00:00`).toISOString()
      : undefined;
    const untilIso = deliveryFilters.until
      ? new Date(`${deliveryFilters.until}T23:59:59`).toISOString()
      : undefined;
    const [healthBundle, deliveryRows] = await Promise.all([
      SocialHubApiClient.fetchHealth(accessToken),
      SocialHubApiClient.fetchDeliveryLog(accessToken, {
        limit: 80,
        platformCode: deliveryFilters.platformCode || undefined,
        status: deliveryFilters.status || undefined,
        since: sinceIso,
        until: untilIso,
      }),
    ]);
    setHealth(healthBundle.health);
    setNotificationInsights(healthBundle.notificationInsights);
    setDeliveries(deliveryRows);
  }, [accessToken, deliveryFilters]);

  useEffect(() => {
    if (!accessToken || activeTab !== "health" || !snapshot || subscriptionBlocked) {
      return;
    }
    setAlertThresholdDraft({
      healthAlertMinSeverity:
        snapshot.settings.healthAlertMinSeverity ?? "attention",
      healthAlertFailureThreshold:
        snapshot.settings.healthAlertFailureThreshold ?? 1,
      healthAlertPlatformThresholdsJson:
        snapshot.settings.healthAlertPlatformThresholdsJson ?? "",
      healthAlertSlackCooldownMinutes:
        snapshot.settings.healthAlertSlackCooldownMinutes ?? 1440,
    });
    setSlackSettingsDraft({
      socialSlackWebhookUrl: snapshot.settings.socialSlackWebhookUrl ?? "",
      socialSlackUseMessagingFallback:
        snapshot.settings.socialSlackUseMessagingFallback ?? true,
      socialSlackNotifyOutboundFailures:
        snapshot.settings.socialSlackNotifyOutboundFailures ?? false,
      socialSlackOutboundFailureCooldownMinutes:
        snapshot.settings.socialSlackOutboundFailureCooldownMinutes ?? 15,
      socialSlackDailyDigestEnabled:
        snapshot.settings.socialSlackDailyDigestEnabled ?? false,
      socialSlackDigestBusinessHoursOnly:
        snapshot.settings.socialSlackDigestBusinessHoursOnly ?? false,
      socialSlackDigestTimezone:
        snapshot.settings.socialSlackDigestTimezone ?? "Europe/Istanbul",
      socialSlackDigestHourStart:
        snapshot.settings.socialSlackDigestHourStart ?? 9,
      socialSlackDigestHourEnd: snapshot.settings.socialSlackDigestHourEnd ?? 18,
    });
    void loadHealthData().catch(() => setError("Sağlık verisi yüklenemedi."));
  }, [accessToken, activeTab, snapshot, subscriptionBlocked, loadHealthData]);

  useEffect(() => {
    if (!accessToken || activeTab !== "inbox" || !snapshot || subscriptionBlocked) {
      return;
    }
    setInboxPreviewLoading(true);
    void SocialHubApiClient.fetchInboxThreadsPreview(accessToken, 10)
      .then(setInboxThreadsPreview)
      .catch(() => setError("Gelen kutusu önizleme yüklenemedi."))
      .finally(() => setInboxPreviewLoading(false));
  }, [accessToken, activeTab, snapshot, subscriptionBlocked]);

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
        const audit = await SocialHubApiClient.fetchAuditLog(
          accessToken,
          auditFocus === "webhook" ? "webhook" : undefined,
        );
        setAuditEntries(audit.entries);
      } catch {
        setError("Ekip verisi yüklenemedi.");
      }
    })();
  }, [
    accessToken,
    activeTab,
    snapshot?.permissions.canManageSettings,
    auditFocus,
  ]);

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

  const platformOptions = (snapshot?.providers ?? []).map((p) => ({
    code: p.platformCode,
    label: p.label,
  }));

  return (
    <div className="social-hub-page">
      <header className="social-hub-intro">
        <h2 className="social-hub-intro-title">Sosyal medya & kanallar</h2>
        <p className="social-hub-intro-lead">
          Kanal bağlantıları (Meta, WhatsApp, LinkedIn), gelen kutusu, yayın onayı ve
          ekip izinleri. Yanıtlar Mesajlar üzerinden bağlı hesaplara gider.
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
                    if (result.oauth.authorizationUrl) {
                      window.location.href = result.oauth.authorizationUrl;
                      return;
                    }
                    setStatus(result.oauth.message);
                  })
                }
                onDisconnect={(code) =>
                  void runAction(async () => {
                    await SocialHubApiClient.disconnectPlatform(accessToken, code);
                    setStatus("Bağlantı kesildi.");
                  })
                }
                onRoadmapInterest={(code, interested) =>
                  void runAction(async () => {
                    const result = await SocialHubApiClient.setRoadmapInterest(
                      accessToken,
                      code,
                      interested,
                    );
                    setSnapshot((prev) =>
                      prev
                        ? {
                            ...prev,
                            roadmapProviders: result.roadmapProviders ?? prev.roadmapProviders,
                            settings: result.settings ?? prev.settings,
                          }
                        : prev,
                    );
                    setStatus(
                      interested
                        ? `${code} için öncelik kaydedildi.`
                        : "Yol haritası ilgisi kaldırıldı.",
                    );
                  })
                }
                onRoadmapConnect={(code) =>
                  void runAction(async () => {
                    const result = await SocialHubApiClient.connectRoadmapPlatform(
                      accessToken,
                      code,
                    );
                    if (result.oauth.authorizationUrl) {
                      window.location.href = result.oauth.authorizationUrl;
                      return;
                    }
                    setStatus(result.oauth.message);
                    await reload();
                  })
                }
                onRoadmapDisconnect={(code) =>
                  void runAction(async () => {
                    await SocialHubApiClient.disconnectRoadmapPlatform(
                      accessToken,
                      code,
                    );
                    setStatus("Yol haritası bağlantısı kesildi.");
                    await reload();
                  })
                }
                onRoadmapRefreshToken={(code) =>
                  void runAction(async () => {
                    const result = await SocialHubApiClient.refreshRoadmapToken(
                      accessToken,
                      code,
                    );
                    if (result.roadmapProviders) {
                      setSnapshot((prev) =>
                        prev
                          ? {
                              ...prev,
                              roadmapProviders: result.roadmapProviders,
                            }
                          : prev,
                      );
                    }
                    setStatus(result.refresh.message);
                    await reload();
                  })
                }
              />
            ) : null}
            {activeTab === "health" ? (
              <SocialHealthPanel
                health={health}
                notificationInsights={notificationInsights}
                deliveries={deliveries}
                deliveryFilters={deliveryFilters}
                busy={busy}
                canManage={snapshot.permissions.canManageConnections}
                healthAlertsEnabled={snapshot.settings.healthAlertsEnabled ?? true}
                healthAlertMinSeverity={alertThresholdDraft.healthAlertMinSeverity}
                healthAlertFailureThreshold={
                  alertThresholdDraft.healthAlertFailureThreshold
                }
                healthAlertPlatformThresholdsJson={
                  alertThresholdDraft.healthAlertPlatformThresholdsJson
                }
                onAlertThresholdPatch={(patch) =>
                  setAlertThresholdDraft((current) => ({ ...current, ...patch }))
                }
                onSaveAlertThresholds={() =>
                  void runAction(async () => {
                    await SocialHubApiClient.updateSettings(accessToken, {
                      healthAlertMinSeverity:
                        alertThresholdDraft.healthAlertMinSeverity,
                      healthAlertFailureThreshold:
                        alertThresholdDraft.healthAlertFailureThreshold,
                      healthAlertPlatformThresholdsJson:
                        alertThresholdDraft.healthAlertPlatformThresholdsJson ||
                        undefined,
                    });
                    await reload();
                    setStatus("Uyarı eşikleri kaydedildi.");
                  })
                }
                socialSlackWebhookUrl={slackSettingsDraft.socialSlackWebhookUrl}
                socialSlackUseMessagingFallback={
                  slackSettingsDraft.socialSlackUseMessagingFallback
                }
                socialSlackNotifyOutboundFailures={
                  slackSettingsDraft.socialSlackNotifyOutboundFailures
                }
                socialSlackOutboundFailureCooldownMinutes={
                  slackSettingsDraft.socialSlackOutboundFailureCooldownMinutes
                }
                socialSlackDailyDigestEnabled={
                  slackSettingsDraft.socialSlackDailyDigestEnabled
                }
                socialSlackDailyDigestLastSentAt={
                  snapshot.settings.socialSlackDailyDigestLastSentAt ?? null
                }
                socialSlackDigestBusinessHoursOnly={
                  slackSettingsDraft.socialSlackDigestBusinessHoursOnly
                }
                socialSlackDigestTimezone={slackSettingsDraft.socialSlackDigestTimezone}
                socialSlackDigestHourStart={slackSettingsDraft.socialSlackDigestHourStart}
                socialSlackDigestHourEnd={slackSettingsDraft.socialSlackDigestHourEnd}
                onSlackSettingsPatch={(patch) =>
                  setSlackSettingsDraft((current) => ({ ...current, ...patch }))
                }
                onSaveSlackSettings={() =>
                  void runAction(async () => {
                    await SocialHubApiClient.updateSettings(accessToken, {
                      socialSlackWebhookUrl:
                        slackSettingsDraft.socialSlackWebhookUrl.trim() ||
                        null,
                      socialSlackUseMessagingFallback:
                        slackSettingsDraft.socialSlackUseMessagingFallback,
                      socialSlackNotifyOutboundFailures:
                        slackSettingsDraft.socialSlackNotifyOutboundFailures,
                      socialSlackOutboundFailureCooldownMinutes:
                        slackSettingsDraft.socialSlackOutboundFailureCooldownMinutes,
                      socialSlackDailyDigestEnabled:
                        slackSettingsDraft.socialSlackDailyDigestEnabled,
                      socialSlackDigestBusinessHoursOnly:
                        slackSettingsDraft.socialSlackDigestBusinessHoursOnly,
                      socialSlackDigestTimezone:
                        slackSettingsDraft.socialSlackDigestTimezone,
                      socialSlackDigestHourStart:
                        slackSettingsDraft.socialSlackDigestHourStart,
                      socialSlackDigestHourEnd:
                        slackSettingsDraft.socialSlackDigestHourEnd,
                    });
                    await reload();
                    setStatus("Slack ayarları kaydedildi.");
                  })
                }
                onTestSlack={() =>
                  void runAction(async () => {
                    const result = await SocialHubApiClient.sendSlackTest(
                      accessToken,
                    );
                    setStatus(result.message);
                  })
                }
                onSendDigestNow={() =>
                  void runAction(async () => {
                    const result = await SocialHubApiClient.sendSlackDigestNow(
                      accessToken,
                    );
                    await reload();
                    setStatus(result.message);
                  })
                }
                healthAlertSlackCooldownMinutes={
                  alertThresholdDraft.healthAlertSlackCooldownMinutes
                }
                onHealthSlackCooldownChange={(minutes) =>
                  setAlertThresholdDraft((current) => ({
                    ...current,
                    healthAlertSlackCooldownMinutes: minutes,
                  }))
                }
                onSaveHealthSlackCooldown={() =>
                  void runAction(async () => {
                    await SocialHubApiClient.updateSettings(accessToken, {
                      healthAlertSlackCooldownMinutes:
                        alertThresholdDraft.healthAlertSlackCooldownMinutes,
                    });
                    await reload();
                    setStatus("Sağlık Slack tekrar süresi kaydedildi.");
                  })
                }
                onDeliveryFiltersChange={(patch) =>
                  setDeliveryFilters((current) => ({ ...current, ...patch }))
                }
                onApplyDeliveryFilters={() =>
                  void runAction(async () => {
                    await loadHealthData();
                  })
                }
                onExportDeliveries={() =>
                  void runAction(async () => {
                    const sinceIso = deliveryFilters.since
                      ? new Date(`${deliveryFilters.since}T00:00:00`).toISOString()
                      : undefined;
                    const untilIso = deliveryFilters.until
                      ? new Date(`${deliveryFilters.until}T23:59:59`).toISOString()
                      : undefined;
                    await SocialHubApiClient.downloadDeliveryExport(accessToken, {
                      platformCode: deliveryFilters.platformCode || undefined,
                      status: deliveryFilters.status || undefined,
                      since: sinceIso,
                      until: untilIso,
                      limit: 500,
                    });
                    setStatus("CSV indirildi.");
                  })
                }
                onToggleHealthAlerts={(enabled) =>
                  void runAction(async () => {
                    await SocialHubApiClient.updateSettings(accessToken, {
                      healthAlertsEnabled: enabled,
                    });
                    await reload();
                    setStatus(
                      enabled
                        ? "Sağlık uyarıları açıldı."
                        : "Sağlık uyarıları kapatıldı.",
                    );
                  })
                }
                socialHubWeeklyEmailEnabled={
                  snapshot.settings.socialHubWeeklyEmailEnabled ?? false
                }
                onToggleWeeklyEmail={(enabled) =>
                  void runAction(async () => {
                    await SocialHubApiClient.updateSettings(accessToken, {
                      socialHubWeeklyEmailEnabled: enabled,
                    });
                    await reload();
                    setStatus(
                      enabled
                        ? "Haftalık e-posta özet açıldı."
                        : "Haftalık e-posta özet kapatıldı.",
                    );
                  })
                }
                onSendWeeklyEmailNow={() =>
                  void runAction(async () => {
                    const result = await SocialHubApiClient.sendWeeklyEmailNow(
                      accessToken,
                    );
                    await reload();
                    await loadHealthData();
                    setStatus(result.message);
                  })
                }
                onExportInsights={() =>
                  void runAction(async () => {
                    await SocialHubApiClient.downloadInsightsExport(accessToken);
                    setStatus("Bildirim özet CSV indirildi.");
                  })
                }
                onExportWebhookActivity={() =>
                  void runAction(async () => {
                    await SocialHubApiClient.downloadWebhookActivityExport(
                      accessToken,
                    );
                    setStatus("Webhook aktivite CSV indirildi.");
                  })
                }
                onReload={() =>
                  void runAction(async () => {
                    await loadHealthData();
                    setStatus("Sağlık verisi güncellendi.");
                  })
                }
                onRefreshToken={(code) =>
                  void runAction(async () => {
                    const isRoadmap =
                      code === "TIKTOK" || code === "YOUTUBE";
                    const result = isRoadmap
                      ? await SocialHubApiClient.refreshRoadmapToken(
                          accessToken,
                          code,
                        )
                      : await SocialHubApiClient.refreshConnectionToken(
                          accessToken,
                          code,
                        );
                    setStatus(result.refresh.message);
                    await loadHealthData();
                  })
                }
              />
            ) : null}
            {activeTab === "inbox" ? (
              <SocialInboxPanel
                snapshot={snapshot}
                threadsPreview={inboxThreadsPreview}
                threadsPreviewLoading={inboxPreviewLoading}
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
                    await reload();
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
                draftMedia={draftMedia}
                busy={busy}
                platformOptions={platformOptions}
                onDraftText={setDraftText}
                onAddMediaFiles={(files) =>
                  void runAction(async () => {
                    if (!files?.length || !accessToken) {
                      return;
                    }
                    const remaining = 4 - draftMedia.length;
                    const slice = Array.from(files).slice(0, remaining);
                    const uploaded: Array<{
                      mediaRef: string;
                      previewUrl: string;
                      filename: string;
                    }> = [];
                    for (const file of slice) {
                      const attachment = await readFileAsAttachment(file);
                      const result = await SocialHubApiClient.uploadPublishMedia(
                        accessToken,
                        {
                          filename: attachment.filename,
                          contentType: attachment.contentType,
                          contentBase64: attachment.contentBase64,
                        },
                      );
                      uploaded.push({
                        mediaRef: result.media.mediaRef,
                        previewUrl:
                          attachment.previewUrl ??
                          SocialHubApiClient.buildPublishMediaPreviewUrl(
                            result.media.mediaId,
                          ),
                        filename: result.media.filename,
                      });
                    }
                    setDraftMedia((current) => [...current, ...uploaded]);
                    setStatus(`${uploaded.length} görsel yüklendi.`);
                  })
                }
                onRemoveDraftMedia={(mediaRef) =>
                  setDraftMedia((current) =>
                    current.filter((row) => row.mediaRef !== mediaRef),
                  )
                }
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
                      mediaUrls: draftMedia.map((row) => row.mediaRef),
                    });
                    setDraftText("");
                    setDraftMedia([]);
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
                    if (result.post.statusCode === "PUBLISHED") {
                      setStatus(
                        result.providerMessage ?? "Gönderi kanallarda yayınlandı.",
                      );
                    } else {
                      setStatus(
                        result.post.lastErrorMessage ??
                          result.providerMessage ??
                          "Yayın başarısız; gönderi listesindeki hatayı kontrol edin.",
                      );
                    }
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
                busy={busy}
                onExportAnalytics={() =>
                  void runAction(async () => {
                    await SocialHubApiClient.downloadAnalyticsExport(accessToken);
                    setStatus("Analitik CSV indirildi.");
                  })
                }
              />
            ) : null}
            {activeTab === "team" ? (
              <SocialTeamPanel
                settings={snapshot.settings}
                permissions={snapshot.permissions}
                members={teamMembers}
                assignableRoleCodes={assignableRoles}
                auditEntries={auditEntries}
                auditFocus={auditFocus}
                integrationsPath={integrationsPath}
                busy={busy}
                onAuditFocusChange={(focus) => setAuditFocus(focus)}
                onExportAuditLog={() =>
                  void runAction(async () => {
                    await SocialHubApiClient.downloadAuditLogExport(
                      accessToken,
                      auditFocus === "webhook" ? "webhook" : undefined,
                    );
                    setStatus("Denetim CSV indirildi.");
                  })
                }
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
                    const audit = await SocialHubApiClient.fetchAuditLog(
                      accessToken,
                      auditFocus === "webhook" ? "webhook" : undefined,
                    );
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
