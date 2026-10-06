"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SocialHubPageClient } from "../../app/(dashboard)/hesap/sosyal-medya/SocialHubPageClient";
import { MessagingMailWebEmbed } from "../messaging/MessagingMailWebEmbed";
import { MessagingConversationPanel } from "../messaging/MessagingConversationPanel";
import { MessagingThreadSidebar } from "../messaging/MessagingThreadSidebar";
import { MessagingChatModalsLayer } from "../messaging/MessagingChatModalsLayer";
import { MessagingChatComplianceStrip } from "../messaging/MessagingChatComplianceStrip";
import { useWebSession } from "../../context/WebSessionProvider";
import { useMessagingChatController } from "../../hooks/useMessagingChatController";
import { ekolojikSectionToMailHandoff } from "../../lib/ekolojikMailSectionHandoff";
import {
  parseEkolojikHubSection,
  type EkolojikHubSection,
} from "../../lib/ekolojikHubTypes";

export type { EkolojikHubSection };

export function EkolojikCommunicationsHubClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, locale, session } = useWebSession();
  const section = parseEkolojikHubSection(searchParams.get("bolum"));
  const [composeTo, setComposeTo] = useState<string | undefined>(undefined);
  const [openCompose, setOpenCompose] = useState(false);

  useEffect(() => {
    setOpenCompose(false);
  }, [section]);

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

  const {
    moduleBlocked,
    errorMessage,
    activeThreadId,
    mobileThreadOpen,
  } = chat;

  const setSection = (next: EkolojikHubSection) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("bolum", next);
    router.replace(`/marketim/posta-ve-mesaj?${params.toString()}`, {
      scroll: false,
    });
  };

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
              setSection("posta");
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
            onClick={() => setSection("posta")}
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
            onClick={() => setSection("fatura")}
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
            onClick={() => setSection("mesajlar")}
          >
            Müşteri mesajları
          </button>
          <button
            type="button"
            className={
              section === "gonderilen"
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => setSection("gonderilen")}
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
            onClick={() => setSection("arsiv")}
          >
            Arşiv
          </button>
          <button
            type="button"
            className={
              section === "sosyal"
                ? "ekolojik-comms-sidebar-item ekolojik-comms-sidebar-item--active"
                : "ekolojik-comms-sidebar-item"
            }
            onClick={() => setSection("sosyal")}
          >
            Sosyal medya
          </button>
          <p className="ekolojik-comms-sidebar-foot module-hint">SMTP / IMAP: NB posta altyapısı</p>
        </nav>
        <div className="ekolojik-comms-main">
          {section === "mesajlar" && moduleBlocked ? (
            <p className="module-hint messaging-module-blocked">
              Firma sohbeti modülü bu hesapta kapalı. Abonelik veya paket
              ayarlarını kontrol edin.
            </p>
          ) : null}
          {section === "mesajlar" && errorMessage && !moduleBlocked ? (
            <p className="error banner error--light">{errorMessage}</p>
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
          {section === "sosyal" ? (
            <div className="ekolojik-comms-social-wrap">
              <SocialHubPageClient />
            </div>
          ) : null}
          {section === "mesajlar" ? (
            <>
            <MessagingChatComplianceStrip chat={chat} />
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
              />
              <MessagingConversationPanel
                chat={chat}
                accessToken={accessToken}
                locale={locale}
                session={session}
                chatBackgroundId="default"
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
      {section === "mesajlar" ? <MessagingChatModalsLayer chat={chat} /> : null}
    </div>
  );
}
