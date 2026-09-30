"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useWebSession } from "../../context/WebSessionProvider";
import { navigateToPlatformSupportChat } from "../../lib/platformSupportMessaging";

type Props = {
  children: ReactNode;
  className?: string;
  /** Mesajlar açıldığında sohbet kutusuna önerilen metin (kullanıcı düzenleyebilir). */
  suggestedDraft?: string;
};

export function PlatformSupportChatButton({
  children,
  className,
  suggestedDraft,
}: Props) {
  const router = useRouter();
  const { accessToken, locale } = useWebSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <span className="platform-support-chat-wrap">
      <button
        type="button"
        className={className}
        disabled={busy || !accessToken}
        onClick={() => {
          setError("");
          setBusy(true);
          void navigateToPlatformSupportChat({
            accessToken,
            locale,
            router,
            suggestedDraft,
          })
            .catch((err) => {
              setError(
                err instanceof Error ? err.message : "Destek sohbeti açılamadı",
              );
            })
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "Açılıyor…" : children}
      </button>
      {error ? (
        <p className="form-error account-support-chat-error" role="alert">
          {error}
        </p>
      ) : null}
    </span>
  );
}
