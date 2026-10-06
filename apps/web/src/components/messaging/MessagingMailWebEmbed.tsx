"use client";

import { useEffect, useMemo, useRef } from "react";
import { useWebSession } from "../../context/WebSessionProvider";
import {
  isMailEmbedTokenRequest,
  LERTA_MAIL_EMBED_CHILD_ORIGIN,
  type MailEmbedTokenMessage,
} from "../../lib/MailEmbeddedSession";
import { buildMailWebSsoHandoffUrl } from "../../lib/MailWebUrl";
import type { MailWebEmbedHandoff } from "../../lib/mailWebEmbedDeepLink";

type Props = {
  className?: string;
  handoff?: MailWebEmbedHandoff;
  /** Ekolojik hub: tek navigasyon — webmail sol menü gizli. */
  hubShell?: boolean;
  /** @deprecated use handoff.composeTo */
  composeTo?: string;
};

/** posta.lerta.com.tr webmail — logistics oturumu ile SSO (iframe + postMessage). */
export function MessagingMailWebEmbed({
  className = "",
  handoff,
  hubShell = false,
  composeTo,
}: Props) {
  const { accessToken } = useWebSession();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const embedSrc = useMemo(() => {
    if (!accessToken) {
      return null;
    }
    const merged: MailWebEmbedHandoff = {
      ...handoff,
      composeTo: handoff?.composeTo ?? composeTo?.trim() ?? undefined,
    };
    return buildMailWebSsoHandoffUrl(accessToken, {
      embed: true,
      embedHubShell: hubShell || merged.embedHubShell,
      ...merged,
    });
  }, [accessToken, composeTo, handoff, hubShell]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    const childOrigin = LERTA_MAIL_EMBED_CHILD_ORIGIN;
    const parentTheme =
      document.documentElement.getAttribute("data-mail-theme") === "dark"
        ? "dark"
        : "light";

    const pushToken = () => {
      const win = iframeRef.current?.contentWindow;
      if (!win) {
        return;
      }
      const message: MailEmbedTokenMessage = {
        type: "lerta-mail-set-token",
        accessToken,
      };
      win.postMessage(message, childOrigin);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== childOrigin) {
        return;
      }
      if (isMailEmbedTokenRequest(event.data)) {
        pushToken();
      }
    };

    const pushTheme = () => {
      const win = iframeRef.current?.contentWindow;
      if (!win) {
        return;
      }
      win.postMessage(
        { type: "lerta-mail-set-theme", theme: parentTheme },
        childOrigin,
      );
    };

    window.addEventListener("message", onMessage);
    const interval = window.setInterval(() => {
      pushToken();
      pushTheme();
    }, 45_000);
    pushToken();
    pushTheme();

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(interval);
    };
  }, [accessToken]);

  if (!embedSrc) {
    return (
      <p className="module-hint">Oturum gerekli — sayfayı yenileyin veya tekrar giriş yapın.</p>
    );
  }

  return (
    <div className={`messaging-mail-embed ${className}`.trim()}>
      <iframe
        ref={iframeRef}
        title="Lerta Posta webmail"
        src={embedSrc}
        className="messaging-mail-embed-frame"
        allow="clipboard-read; clipboard-write"
        onLoad={() => {
          if (!accessToken || !iframeRef.current?.contentWindow) {
            return;
          }
          const message: MailEmbedTokenMessage = {
            type: "lerta-mail-set-token",
            accessToken,
          };
          iframeRef.current.contentWindow.postMessage(
            message,
            LERTA_MAIL_EMBED_CHILD_ORIGIN,
          );
        }}
      />
    </div>
  );
}
