"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { MessagingApiClient } from "../lib/MessagingApiClient";
import {
  readStoredChatBackground,
  rememberChatBackground,
  type ChatConversationBackgroundId,
} from "../lib/messagingChatBackground";
import {
  parseMode,
  readStoredMessagingTab,
  rememberMessagingTab,
  type MessagingMode,
} from "../lib/messagingPageHelpers";

type Params = {
  accessToken: string;
  locale: string;
  searchParams: ReadonlyURLSearchParams;
  router: AppRouterInstance;
};

export function useMessagingPageRoute({
  accessToken,
  locale,
  searchParams,
  router,
}: Params) {
  const preferChat =
    Boolean(searchParams.get("companyId")) ||
    Boolean(searchParams.get("threadId"));
  const [mode, setMode] = useState<MessagingMode>(() =>
    parseMode(searchParams.get("tab"), preferChat),
  );
  const [chatBackgroundId, setChatBackgroundId] =
    useState<ChatConversationBackgroundId>(() =>
      typeof window === "undefined" ? "default" : readStoredChatBackground(),
    );
  const [chatBackgroundPickerOpen, setChatBackgroundPickerOpen] = useState(false);
  const [mailEmbedFullscreen, setMailEmbedFullscreen] = useState(false);

  useEffect(() => {
    const chatLink =
      Boolean(searchParams.get("companyId")) ||
      Boolean(searchParams.get("threadId"));
    const mailComposeLink =
      Boolean(searchParams.get("composeTo")) ||
      Boolean(searchParams.get("email"));
    if (mailComposeLink) {
      setMode("email");
    } else {
      setMode(parseMode(searchParams.get("tab"), chatLink));
    }
    const tab = searchParams.get("tab");
    if (!tab && !chatLink && !mailComposeLink) {
      const stored = readStoredMessagingTab();
      const fallbackTab = stored === "chat" ? "sohbet" : "email";
      if (!accessToken) {
        router.replace(`/messaging?tab=${fallbackTab}`, { scroll: false });
      } else {
        void MessagingApiClient.fetchMessagingHubDefault(accessToken, locale)
          .then((payload) => {
            const next =
              stored ?? (payload.defaultTab === "chat" ? "chat" : "email");
            const tabParam = next === "chat" ? "sohbet" : "email";
            router.replace(`/messaging?tab=${tabParam}`, { scroll: false });
          })
          .catch(() => {
            router.replace(`/messaging?tab=${fallbackTab}`, { scroll: false });
          });
      }
    }
    const rawEmail = searchParams.get("email")?.trim();
    if (rawEmail && !searchParams.get("composeTo")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "email");
      params.set("composeTo", rawEmail);
      params.delete("email");
      router.replace(`/messaging?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, router, accessToken, locale]);

  useEffect(() => {
    rememberChatBackground(chatBackgroundId);
  }, [chatBackgroundId]);

  const switchMode = useCallback(
    (next: MessagingMode): void => {
      setChatBackgroundPickerOpen(false);
      setMode(next);
      rememberMessagingTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "email") {
        params.set("tab", "email");
      } else {
        params.set("tab", "chat");
      }
      const query = params.toString();
      router.replace(query ? `/messaging?${query}` : "/messaging", {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  return {
    mode,
    switchMode,
    chatBackgroundId,
    setChatBackgroundId,
    chatBackgroundPickerOpen,
    setChatBackgroundPickerOpen,
    mailEmbedFullscreen,
    setMailEmbedFullscreen,
  };
}
