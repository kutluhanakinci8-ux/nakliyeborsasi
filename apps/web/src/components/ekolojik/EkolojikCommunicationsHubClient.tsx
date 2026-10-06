"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SocialHubPageClient } from "../../app/(dashboard)/hesap/sosyal-medya/SocialHubPageClient";
import { MessagingMailWebEmbed } from "../messaging/MessagingMailWebEmbed";
import { MessagingConversationPanel } from "../messaging/MessagingConversationPanel";
import { MessagingSideRail } from "../messaging/MessagingSideRail";
import { MessagingThreadSidebar } from "../messaging/MessagingThreadSidebar";
import { MessagingChatModalsLayer } from "../messaging/MessagingChatModalsLayer";
import { MessagingChatComplianceStrip } from "../messaging/MessagingChatComplianceStrip";
import { MessagingWhatsappBridgeHubCard } from "../messaging/MessagingWhatsappBridgeHubCard";
import { MessagingSlackBridgeCard } from "../messaging/MessagingSlackBridgeCard";
import { MessagingAutomationCatalogPanel } from "../messaging/MessagingAutomationCatalogPanel";
import { IntegrationsMessagingHubPanel } from "../integrations/IntegrationsMessagingHubPanel";
import { ekolojikMessagingChannelSettingsHref } from "../../lib/ekolojikIntegrationsDeepLink";
import { MessagingChatNotificationsPanel } from "../messaging/MessagingChatNotificationsPanel";
import { MessagingKvkkRetentionPanel } from "../messaging/MessagingKvkkRetentionPanel";
import { EKOLOJIK_KVKK_HUB_PATH } from "../../lib/ekolojikKvkkDeepLink";
import { useWebSession } from "../../context/WebSessionProvider";
import { useMessagingChatController } from "../../hooks/useMessagingChatController";
import { ekolojikSectionToMailHandoff } from "../../lib/ekolojikMailSectionHandoff";
import {
  applyEkolojikSectionQueryParams,
  isEkolojikMessagingChatSection,
  isEkolojikGroupInbox,
  isEkolojikSocialDmInbox,
} from "../../lib/ekolojikMessagingChatSection";
import {
  ekolojikSocialDmInboxHref,
  EKOLOJIK_HUB_PATH,
} from "../../lib/ekolojikSocialMessagingDeepLink";
import {
  EKOLOJIK_SOCIAL_OAUTH_WEB_RETURN_QUERY,
  ekolojikSocialHubInboxHref,
  ekolojikSocialHubPublishingHref,
  isEkolojikSocialHubInboxTab,
  isEkolojikSocialHubPublishingTab,
  isEkolojikSocialHubTemplatesTab,
  ekolojikSocialHubTemplatesHref,
  ekolojikSocialHubAnalyticsHref,
  isEkolojikSocialHubAnalyticsTab,
  ekolojikSocialHubTelegramHref,
  isEkolojikSocialHubTelegramConnections,
  ekolojikSocialHubHealthHref,
  ekolojikSocialHubIntegrationGateHref,
  isEkolojikSocialHubHealthTab,
  isEkolojikSocialHubIntegrationGate,
  ekolojikSocialHubBetaPlatformHref,
  isEkolojikSocialHubBetaPlatformConnections,
  ekolojikSocialHubPwaHealthHref,
  isEkolojikSocialHubPwaHealth,
  parseEkolojikBetaPlatformHighlight,
} from "../../lib/ekolojikSocialHubDeepLink";
import {
  parseEkolojikHubSection,
  type EkolojikHubSection,
} from "../../lib/ekolojikHubTypes";
import {
  readStoredChatBackground,
  rememberChatBackground,
  type ChatConversationBackgroundId,
} from "../../lib/messagingChatBackground";

export type { EkolojikHubSection };

export function EkolojikCommunicationsHubClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, locale, session } = useWebSession();
  const section = parseEkolojikHubSection(searchParams.get("bolum"));
  const socialDmInbox = isEkolojikSocialDmInbox(section, searchParams);
  const groupInbox = isEkolojikGroupInbox(section, searchParams);
  const socialInboxHub = isEkolojikSocialHubInboxTab(
    searchParams.get("bolum"),
    searchParams.get("tab"),
  );
  const socialPublishingHub = isEkolojikSocialHubPublishingTab(
    searchParams.get("bolum"),
    searchParams.get("tab"),
  );
  const socialTemplatesHub = isEkolojikSocialHubTemplatesTab(
    searchParams.get("bolum"),
    searchParams.get("tab"),
  );
  const socialAnalyticsHub = isEkolojikSocialHubAnalyticsTab(
    searchParams.get("bolum"),
    searchParams.get("tab"),
  );
  const socialTelegramHub = isEkolojikSocialHubTelegramConnections(
    searchParams.get("bolum"),
    searchParams.get("tab"),
    searchParams.get("platform"),
  );
  const socialHealthHub = isEkolojikSocialHubHealthTab(
    searchParams.get("bolum"),
    searchParams.get("tab"),
  );
  const socialIntegrationGateHub = isEkolojikSocialHubIntegrationGate(
    searchParams.get("bolum"),
    searchParams.get("tab"),
    searchParams.get("integration_gate") ?? searchParams.get("gate"),
  );
  const betaPlatformHighlight = parseEkolojikBetaPlatformHighlight(
    searchParams.get("platform"),
  );
  const socialTikTokHub = isEkolojikSocialHubBetaPlatformConnections(
    searchParams.get("bolum"),
    searchParams.get("tab"),
    betaPlatformHighlight === "TIKTOK" ? "TIKTOK" : null,
  );
  const socialYouTubeHub = isEkolojikSocialHubBetaPlatformConnections(
    searchParams.get("bolum"),
    searchParams.get("tab"),
    betaPlatformHighlight === "YOUTUBE" ? "YOUTUBE" : null,
  );
  const socialPwaHealthHub = isEkolojikSocialHubPwaHealth(
    searchParams.get("bolum"),
    searchParams.get("tab"),
    searchParams.get("pwa"),
  );
  const [composeTo, setComposeTo] = useState<string | undefined>(undefined);
  const [openCompose, setOpenCompose] = useState(false);

  useEffect(() => {
    setOpenCompose(false);
  }, [section]);

  useEffect(() => {
    if (section !== "sosyal-dm") {
      return;
    }
    if (searchParams.get("filter")?.toLowerCase() === "social") {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", "social");
    router.replace(`/marketim/posta-ve-mesaj?${params.toString()}`, {
      scroll: false,
    });
  }, [section, searchParams, router]);

  useEffect(() => {
    if (section !== "grup-sohbet") {
      return;
    }
    if (searchParams.get("filter")?.toLowerCase() === "group") {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", "group");
    router.replace(`/marketim/posta-ve-mesaj?${params.toString()}`, {
      scroll: false,
    });
  }, [section, searchParams, router]);

  const chat = useMessagingChatController({
    accessToken,
    locale,
    session,
    searchParams,
    router,
    mode: "chat",
  });

  const mailSection = useMemo(
    () =>
      section === "posta" ||
      section === "fatura" ||
      section === "gonderilen" ||
      section === "arsiv",
    [section],
  );

  const mailHandoff = useMemo(
    () =>
      ekolojikSectionToMailHandoff(section, {
        openCompose,
        composeTo,
      }),
    [section, openCompose, composeTo],
  );

  const folderHint = useMemo(() => {
    if (section === "fatura") {
      return "Fatura: özel klasör «Fatura» (veya adında fatura geçen klasör) webmail’de açılır; yoksa gelen kutusu gösterilir.";
    }
    return null;
  }, [section]);

  const [chatBackgroundId, setChatBackgroundId] =
    useState<ChatConversationBackgroundId>(() =>
      typeof window === "undefined" ? "default" : readStoredChatBackground(),
    );
  const [chatBackgroundPickerOpen, setChatBackgroundPickerOpen] = useState(false);

  useEffect(() => {
    rememberChatBackground(chatBackgroundId);
  }, [chatBackgroundId]);

  const {
    moduleBlocked,
    errorMessage,
    activeThreadId,
    mobileThreadOpen,
    isCompanyOwner,
    channelSettingsOpen,
    setChannelSettingsOpen,
    threads,
    messages,
    totalUnread,
    handleExportArchive,
  } = chat;

  const showMessagingChat = isEkolojikMessagingChatSection(section);

  useEffect(() => {
    if (!showMessagingChat) {
      return;
    }
    if (searchParams.get("waBridge") === "1") {
      setChannelSettingsOpen(true);
    }
  }, [searchParams, showMessagingChat, setChannelSettingsOpen]);

  const navigateSection = (next: EkolojikHubSection) => {
    const params = new URLSearchParams(searchParams.toString());
    applyEkolojikSectionQueryParams(params, next);
    router.replace(`/marketim/posta-ve-mesaj?${params.toString()}`, {
      scroll: false,
    });
  };

  const navigateSocialInboxHub = useCallback(() => {
    const params = new URLSearchParams();
    params.set("bolum", "sosyal");
    params.set("tab", "inbox");
    router.replace(`/marketim/posta-ve-mesaj?${params.toString()}`, {
      scroll: false,
    });
  }, [router]);

  const navigateSocialPublishingHub = useCallback(() => {
    router.replace(ekolojikSocialHubPublishingHref(), { scroll: false });
  }, [router]);

  const navigateSocialTemplatesHub = useCallback(() => {
    router.replace(ekolojikSocialHubTemplatesHref(), { scroll: false });
  }, [router]);

  const navigateSocialAnalyticsHub = useCallback(() => {
    router.replace(ekolojikSocialHubAnalyticsHref(), { scroll: false });
  }, [router]);

  const navigateSocialTelegramHub = useCallback(() => {
    router.replace(ekolojikSocialHubTelegramHref("connect"), { scroll: false });
  }, [router]);

  const navigateSocialHealthHub = useCallback(() => {
    router.replace(ekolojikSocialHubHealthHref(), { scroll: false });
  }, [router]);

  const navigateSocialIntegrationGateHub = useCallback(() => {
    router.replace(ekolojikSocialHubIntegrationGateHref(), { scroll: false });
  }, [router]);

  const navigateSocialTikTokHub = useCallback(() => {
    router.replace(ekolojikSocialHubBetaPlatformHref("TIKTOK"), {
      scroll: false,
    });
  }, [router]);

  const navigateSocialYouTubeHub = useCallback(() => {
    router.replace(ekolojikSocialHubBetaPlatformHref("YOUTUBE"), {
      scroll: false,
    });
  }, [router]);

  const navigateSocialPwaHealthHub = useCallback(() => {
    router.replace(ekolojikSocialHubPwaHealthHref(), { scroll: false });
  }, [router]);

  const switchMessagingRailMode = useCallback(
    (mode: "chat" | "email") => {
      setChatBackgroundPickerOpen(false);
      const next: EkolojikHubSection =
        mode === "email" ? "posta" : "mesajlar";
      const params = new URLSearchParams(searchParams.toString());
      applyEkolojikSectionQueryParams(params, next);
      router.replace(`/marketim/posta-ve-mesaj?${params.toString()}`, {
        scroll: false,
      });
    },
    [searchParams, router],
  );

  return (
    <div className="ekolojik-comms-hub">
      <header className="ekolojik-comms-hub-intro">
        <h1 className="ekolojik-comms-hub-title">Ekolojik Posta &amp; Mesaj</h1>
        <p className="ekolojik-comms-hub-lead">
          Nakliye Borsası arayüzüne benzer — veri ve sunucu tamamen Ekolojik (NB ile
          paylaşılmaz). Posta: tam webmail gömülü; mesajlar: firma sohbeti +
          müşteri yazışmaları; sosyal: Lerta Social Hub.
        </p>
      </header>
      <div className="ekolojik-comms-hub-body">
        <nav className="ekolojik-comms-sidebar" aria-label="Posta ve mesaj">
          <button
            type="button"
            className="ekolojik-comms-sidebar-primary"
            onClick={() => {
              setComposeTo(undefined);
              setOpenCompose(true);
              navigateSection("posta");
            }}
          >
            Yaz
          </button>
          <button
            type="button"
            className={
              section === "posta"
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSection("posta")}
          >
            Gelen
          </button>
          <button
            type="button"
            className={
              section === "fatura"
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSection("fatura")}
          >
            Fatura
          </button>
          <button
            type="button"
            className={
              section === "mesajlar"
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSection("mesajlar")}
          >
            Müşteri mesajları
          </button>
          <button
            type="button"
            className={
              groupInbox
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSection("grup-sohbet")}
          >
            Grup sohbet
          </button>
          <button
            type="button"
            className={
              socialDmInbox
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSection("sosyal-dm")}
          >
            Sosyal DM
          </button>
          <button
            type="button"
            className={
              socialInboxHub
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSocialInboxHub()}
          >
            Sosyal gelen kutusu
          </button>
          <button
            type="button"
            className={
              socialPublishingHub
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSocialPublishingHub()}
          >
            Yayınlar &amp; UTM
          </button>
          <button
            type="button"
            className={
              socialTemplatesHub
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSocialTemplatesHub()}
          >
            Sosyal şablonlar
          </button>
          <button
            type="button"
            className={
              socialAnalyticsHub
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSocialAnalyticsHub()}
          >
            Sosyal analitik
          </button>
          <button
            type="button"
            className={
              socialTelegramHub
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSocialTelegramHub()}
          >
            Telegram
          </button>
          <button
            type="button"
            className={
              socialTikTokHub
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSocialTikTokHub()}
          >
            TikTok (beta)
          </button>
          <button
            type="button"
            className={
              socialYouTubeHub
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSocialYouTubeHub()}
          >
            YouTube (beta)
          </button>
          <button
            type="button"
            className={
              socialHealthHub && !socialPwaHealthHub
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSocialHealthHub()}
          >
            Sosyal ops
          </button>
          <button
            type="button"
            className={
              socialPwaHealthHub
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSocialPwaHealthHub()}
          >
            Sosyal PWA
          </button>
          <button
            type="button"
            className={
              socialIntegrationGateHub
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSocialIntegrationGateHub()}
          >
            Entegrasyon kapısı
          </button>
          <button
            type="button"
            className={
              section === "gonderilen"
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSection("gonderilen")}
          >
            Gönderilen
          </button>
          <button
            type="button"
            className={
              section === "arsiv"
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSection("arsiv")}
          >
            Arşiv
          </button>
          <button
            type="button"
            className={
              section === "entegrasyon"
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSection("entegrasyon")}
          >
            API &amp; Zapier
          </button>
          <button
            type="button"
            className={
              section === "bildirimler"
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSection("bildirimler")}
          >
            Bildirimler
          </button>
          <button
            type="button"
            className={
              section === "kvkk"
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => navigateSection("kvkk")}
          >
            KVKK &amp; saklama
          </button>
          <button
            type="button"
            className={
              section === "sosyal" &&
              !socialInboxHub &&
              !socialPublishingHub &&
              !socialTemplatesHub &&
              !socialAnalyticsHub &&
              !socialTelegramHub &&
              !socialTikTokHub &&
              !socialYouTubeHub &&
              !socialHealthHub &&
              !socialPwaHealthHub &&
              !socialIntegrationGateHub
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => {
              const params = new URLSearchParams();
              params.set("bolum", "sosyal");
              params.set("tab", "connections");
              router.replace(`/marketim/posta-ve-mesaj?${params.toString()}`, {
                scroll: false,
              });
            }}
          >
            Sosyal medya
          </button>
          <p className="ekolojik-comms-sidebar-foot module-hint">SMTP / IMAP: NB posta altyapısı</p>
        </nav>
        <div className="ekolojik-comms-main">
          {showMessagingChat && moduleBlocked ? (
            <p className="module-hint messaging-module-blocked">
              Firma sohbeti modülü bu hesapta kapalı. Abonelik veya paket
              ayarlarını kontrol edin.
            </p>
          ) : null}
          {showMessagingChat && errorMessage && !moduleBlocked ? (
            <p className="error banner error--light">{errorMessage}</p>
          ) : null}
          {showMessagingChat && socialDmInbox ? (
            <p className="module-hint ekolojik-comms-social-dm-hint">
              Instagram, WhatsApp, Telegram ve diğer bağlı kanallardan gelen DM
              konuşmaları. Yanıtlar Social Hub köprüsü ile kanala iletilir.{" "}
              <Link href={ekolojikSocialHubInboxHref()}>
                Sosyal gelen kutusu
              </Link>{" "}
              üzerinden kanal özet ve senkron.
            </p>
          ) : null}
          {showMessagingChat && groupInbox ? (
            <p className="module-hint ekolojik-comms-group-hint">
              Üç veya daha fazla firma; her katılımcıya yükleyici, nakliyeci, acente
              veya gözlemci rolü atanır. «Grup» ile yeni kanal açın.
            </p>
          ) : null}
          {section === "mesajlar" && searchParams.get("listingId") ? (
            <p className="module-hint ekolojik-comms-listing-hint">
              Bu sohbet ilan{" "}
              <code>{searchParams.get("listingId")?.slice(0, 8)}…</code> bağlamında
              açılır. Karşı firma ID girip <strong>Aç</strong> kullanın.
            </p>
          ) : null}
          {folderHint ? (
            <p className="module-hint ekolojik-comms-folder-hint">{folderHint}</p>
          ) : null}
          {section === "kvkk" ? (
            <div className="ekolojik-comms-kvkk-wrap">
              <MessagingKvkkRetentionPanel
                accessToken={accessToken}
                locale={locale}
                isCompanyOwner={isCompanyOwner}
              />
            </div>
          ) : null}
          {section === "bildirimler" ? (
            <div className="ekolojik-comms-notifications-wrap">
              <MessagingChatNotificationsPanel accessToken={accessToken} />
            </div>
          ) : null}
          {section === "entegrasyon" ? (
            <div className="ekolojik-comms-integrations-wrap">
              <IntegrationsMessagingHubPanel
                accessToken={accessToken}
                isCompanyOwner={isCompanyOwner}
                channelSettingsHref={ekolojikMessagingChannelSettingsHref()}
                messagingHref="/marketim/posta-ve-mesaj?bolum=mesajlar"
              />
              <MessagingSlackBridgeCard
                accessToken={accessToken}
                isCompanyOwner={isCompanyOwner}
              />
              <MessagingAutomationCatalogPanel
                accessToken={accessToken}
                isCompanyOwner={isCompanyOwner}
              />
            </div>
          ) : null}
          {section === "sosyal" ? (
            <div className="ekolojik-comms-social-wrap">
              <SocialHubPageClient
                messagingInboxHref={ekolojikSocialDmInboxHref()}
                threadMessagingHref={ekolojikSocialDmInboxHref}
                hubBasePath={EKOLOJIK_HUB_PATH}
                syncTabsToUrl
                prefillPublishingUtmFromUrl
                prefillTemplateFromUrl
                highlightAnalyticsUtmFromUrl
                openTelegramDeepLinkFromUrl
                openIntegrationGateFromUrl
                openBetaPlatformDeepLinkFromUrl
                openPwaHealthFromUrl
                oauthWebReturnQuery={EKOLOJIK_SOCIAL_OAUTH_WEB_RETURN_QUERY}
              />
            </div>
          ) : null}
          {showMessagingChat ? (
            <>
              <MessagingChatComplianceStrip
                chat={chat}
                kvkkHubHref={EKOLOJIK_KVKK_HUB_PATH}
              />
              <MessagingWhatsappBridgeHubCard
                accessToken={accessToken}
                isCompanyOwner={isCompanyOwner}
                channelSettingsOpen={channelSettingsOpen}
                onOpenSettings={() => setChannelSettingsOpen(true)}
              />
              <div className="ekolojik-comms-chat-layout messaging-page-layout">
                <div className="messaging-page-main">
                  <div
                    className={
                      mobileThreadOpen && activeThreadId
                        ? "ekolojik-comms-chat-wrap chat-layout chat-layout--mobile-thread"
                        : "ekolojik-comms-chat-wrap chat-layout"
                    }
                  >
                    <MessagingThreadSidebar
                      chat={chat}
                      locale={locale}
                      accessToken={accessToken}
                      socialDmInboxOnly={socialDmInbox}
                      groupInboxOnly={groupInbox}
                      highlightWhatsappBridge
                    />
                    <MessagingConversationPanel
                      chat={chat}
                      accessToken={accessToken}
                      locale={locale}
                      session={session}
                      chatBackgroundId={chatBackgroundId}
                    />
                  </div>
                </div>
                <MessagingSideRail
                  mode="chat"
                  onSwitchMode={switchMessagingRailMode}
                  threadCount={threads.length}
                  totalUnread={totalUnread}
                  activeMessageCount={messages.length}
                  isCompanyOwner={isCompanyOwner}
                  onExportKvkk={() => void handleExportArchive()}
                  chatBackgroundId={chatBackgroundId}
                  chatBackgroundPickerOpen={chatBackgroundPickerOpen}
                  onToggleChatBackgroundPicker={() =>
                    setChatBackgroundPickerOpen((open) => !open)
                  }
                  onChatBackgroundChange={setChatBackgroundId}
                  onCloseChatBackgroundPicker={() =>
                    setChatBackgroundPickerOpen(false)
                  }
                />
              </div>
            </>
          ) : null}
          {mailSection ? (
            <div className="ekolojik-comms-mail-wrap messaging-mail-embed-wrap messaging-mail-embed-wrap--primary">
              <MessagingMailWebEmbed
                key={`${section}-${openCompose ? "compose" : "view"}`}
                handoff={mailHandoff ?? { mailView: "inbox" }}
              />
            </div>
          ) : null}
        </div>
      </div>
      {showMessagingChat ? <MessagingChatModalsLayer chat={chat} /> : null}
    </div>
  );
}
