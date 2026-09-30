"use client";

import { useCallback, useEffect, useState } from "react";
import { AccountPageShell } from "../../../../components/AccountPageShell";
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
import type { SocialHubSnapshot } from "../../../../lib/socialHubTypes";

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
    void reload().catch(() => setError("Sosyal medya hub verisi yüklenemedi."));
  }, [accessToken, canAccess, reload]);

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
    <AccountPageShell
      title="Sosyal medya & kanallar"
      lead="Hesap bağlantıları, sosyal gelen kutusu, yayınlar ve ekip izinleri — harici API adımları sonraki fazda."
      hidePageHero
    >
      <div className="social-hub-page">
        <SocialHubSectionNav activeTab={activeTab} onTabChange={setActiveTab} />
        {error ? <p className="error banner error--light">{error}</p> : null}
        {status ? <p className="account-save-hint">{status}</p> : null}
        {!canAccess ? (
          <p className="module-hint">Bu alan için firma rolü gerekli.</p>
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
              <SocialAnalyticsPanel snapshot={snapshot} />
            ) : null}
            {activeTab === "team" ? (
              <SocialTeamPanel
                settings={snapshot.settings}
                permissions={snapshot.permissions}
                busy={busy}
                onPatchSettings={(patch) =>
                  void runAction(async () => {
                    await SocialHubApiClient.updateSettings(accessToken, patch);
                    setStatus("Ayarlar güncellendi.");
                  })
                }
              />
            ) : null}
          </>
        )}
      </div>
    </AccountPageShell>
  );
}
