"use client";

import { useEffect, useMemo, useRef } from "react";
import { useWebSession } from "../../context/WebSessionProvider";
import {
  isMailEmbedTokenRequest,
  LERTA_MAIL_EMBED_CHILD_ORIGIN,
  type MailEmbedTokenMessage,
} from "../../lib/MailEmbeddedSession";
import { buildMailWebSsoHandoffUrl } from "../../lib/MailWebUrl";

type Props = {
  className?: string;
};

/** posta.lerta.com.tr webmail — logistics oturumu ile SSO (iframe + postMessage). */
export function MessagingMailWebEmbed({ className = "" }: Props) {
  const { accessToken } = useWebSession();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const embedSrc = useMemo(() => {
    if (!accessToken) {
      return null;
    }
    return buildMailWebSsoHandoffUrl(accessToken, { embed: true });
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    const childOrigin = LERTA_MAIL_EMBED_CHILD_ORIGIN;

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

    window.addEventListener("message", onMessage);
    const interval = window.setInterval(pushToken, 45_000);
    pushToken();

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
