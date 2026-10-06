"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { SocialHubPageClient } from "../../app/(dashboard)/hesap/sosyal-medya/SocialHubPageClient";
import { MessagingMailWebEmbed } from "../messaging/MessagingMailWebEmbed";
import { MessagingConversationPanel } from "../messaging/MessagingConversationPanel";
import { MessagingThreadSidebar } from "../messaging/MessagingThreadSidebar";
import { useWebSession } from "../../context/WebSessionProvider";
import { useMessagingChatController } from "../../hooks/useMessagingChatController";

export type EkolojikHubSection =
  | "posta"
  | "mesajlar"
  | "sosyal"
  | "fatura"
  | "gonderilen"
  | "arsiv";

function parseHubSection(raw: string | null): EkolojikHubSection {
  switch (raw?.trim()) {
    case "mesajlar":
    case "musteri":
      return "mesajlar";
    case "sosyal":
    case "kanallar":
      return "sosyal";
    case "fatura":
      return "fatura";
    case "gonderilen":
      return "gonderilen";
    case "arsiv":
      return "arsiv";
    default:
      return "posta";
  }
}

export function EkolojikCommunicationsHubClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, locale, session } = useWebSession();
  const section = parseHubSection(searchParams.get("bolum"));
  const [composeTo, setComposeTo] = useState<string | undefined>(undefined);

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

  const folderHint = useMemo(() => {
    if (section === "fatura") {
      return "Fatura e-postaları — EK-P4 ile mail-web IMAP klasör eşlemesi tamamlanacak; şimdilik gelen kutusu gömülü.";
    }
    if (section === "gonderilen") {
      return "Gönderilen — EK-P4 ile mail-web «sent» görünümü; şimdilik tam posta istemcisi.";
    }
    if (section === "arsiv") {
      return "Arşiv — EK-P4 ile mail-web arşiv klasörleri; şimdilik tam posta istemcisi.";
    }
    return null;
  }, [section]);

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
              setComposeTo("");
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
          {folderHint ? (
            <p className="module-hint ekolojik-comms-folder-hint">{folderHint}</p>
          ) : null}
          {section === "sosyal" ? (
            <div className="ekolojik-comms-social-wrap">
              <SocialHubPageClient />
            </div>
          ) : null}
          {section === "mesajlar" ? (
            <div className="ekolojik-comms-chat-wrap chat-layout">
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
          ) : null}
          {mailSection ? (
            <div className="ekolojik-comms-mail-wrap messaging-mail-embed-wrap messaging-mail-embed-wrap--primary">
              <MessagingMailWebEmbed composeTo={composeTo} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
