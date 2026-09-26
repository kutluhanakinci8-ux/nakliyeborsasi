"use client";

import { useMemo } from "react";
import { useWebSession } from "../../context/WebSessionProvider";
import { buildMailWebSsoHandoffUrl } from "../../lib/MailWebUrl";

type Props = {
  className?: string;
};

/** posta.lerta.com.tr webmail — logistics oturumu ile SSO (iframe). */
export function MessagingMailWebEmbed({ className = "" }: Props) {
  const { accessToken } = useWebSession();

  const embedSrc = useMemo(() => {
    if (!accessToken) {
      return null;
    }
    const handoff = buildMailWebSsoHandoffUrl(accessToken);
    return handoff;
  }, [accessToken]);

  if (!embedSrc) {
    return (
      <p className="module-hint">Oturum gerekli — sayfayı yenileyin veya tekrar giriş yapın.</p>
    );
  }

  return (
    <div className={`messaging-mail-embed ${className}`.trim()}>
      <iframe
        title="Lerta Posta webmail"
        src={embedSrc}
        className="messaging-mail-embed-frame"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
