"use client";

import { useEffect } from "react";
import { useMailSession } from "@/lib/session";
import {
  isAllowedEmbedParent,
  type MailEmbedTokenMessage,
  type MailEmbedTokenRequestMessage,
} from "@/lib/embeddedParentSession";

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
      const data = event.data as MailEmbedTokenMessage | undefined;
      if (data?.type === "lerta-mail-set-token" && data.accessToken?.trim()) {
        setAccessToken(data.accessToken.trim());
      }
    };

    window.addEventListener("message", onMessage);

    const request: MailEmbedTokenRequestMessage = {
      type: "lerta-mail-request-token",
    };
    for (const origin of ["https://app.lerta.com.tr", "http://localhost:3011"]) {
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
