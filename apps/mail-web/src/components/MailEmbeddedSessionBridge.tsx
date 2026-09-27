"use client";

import { useEffect } from "react";
import { useMailSession } from "@/lib/session";
import {
  isAllowedEmbedParent,
  resolveAllowedEmbedParentOrigins,
  type MailEmbedTokenMessage,
  type MailEmbedTokenRequestMessage,
} from "@/lib/embeddedParentSession";
import { applyMailTheme, type MailTheme } from "@/lib/mailTheme";

/** Üst çerçeveden (app.lerta.com.tr) JWT alır — iframe'de compose 401 önlenir. */
export function MailEmbeddedSessionBridge() {
  const { setAccessToken } = useMailSession();

  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) {
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (!isAllowedEmbedParent(event.origin)) {
        return;
      }
      const data = event.data as
        | MailEmbedTokenMessage
        | { type: "lerta-mail-set-theme"; theme?: MailTheme }
        | undefined;
      if (data?.type === "lerta-mail-set-token" && data.accessToken?.trim()) {
        setAccessToken(data.accessToken.trim());
      }
      if (
        data?.type === "lerta-mail-set-theme" &&
        (data.theme === "light" || data.theme === "dark")
      ) {
        applyMailTheme(data.theme);
      }
    };

    window.addEventListener("message", onMessage);

    const request: MailEmbedTokenRequestMessage = {
      type: "lerta-mail-request-token",
    };
    for (const origin of resolveAllowedEmbedParentOrigins()) {
      try {
        window.parent.postMessage(request, origin);
      } catch {
        /* ignore */
      }
    }

    return () => window.removeEventListener("message", onMessage);
  }, [setAccessToken]);

  return null;
}
