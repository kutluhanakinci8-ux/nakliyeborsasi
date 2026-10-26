"use client";

import { useMemo, useState } from "react";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import {
  buildShareLertaCopy,
  shareLertaViaEmail,
  shareLertaViaSms,
  shareLertaViaSystem,
} from "@/lib/mailShareLertaPosta";

export function MailShareLertaPostaPanel() {
  const { t } = useMailLocale();
  const copy = useMemo(() => buildShareLertaCopy(t), [t]);
  const [hint, setHint] = useState("");

  const canNativeShare =
    typeof navigator !== "undefined" && Boolean(navigator.share);

  return (
    <div className="mail-share-lerta">
      <p className="mail-settings-intro">{t("shareLertaIntro")}</p>
      <div className="mail-share-lerta-actions" role="group" aria-label={t("shareLertaTitle")}>
        <button
          type="button"
          className="mail-share-lerta-btn"
          onClick={() => shareLertaViaEmail(copy)}
        >
          {t("shareLertaEmail")}
        </button>
        <button
          type="button"
          className="mail-share-lerta-btn"
          onClick={() => shareLertaViaSms(copy)}
        >
          {t("shareLertaSms")}
        </button>
        {canNativeShare ? (
          <button
            type="button"
            className="mail-share-lerta-btn"
            onClick={() => {
              void shareLertaViaSystem(copy).then((ok) => {
                if (!ok) {
                  setHint(t("shareLertaNativeFailed"));
                }
              });
            }}
          >
            {t("shareLertaMore")}
          </button>
        ) : null}
      </div>
      {hint ? <p className="mail-settings-muted" role="status">{hint}</p> : null}
      <p className="mail-share-lerta-link">
        <a href="https://posta.lerta.com.tr/login" target="_blank" rel="noreferrer">
          posta.lerta.com.tr
        </a>
      </p>
    </div>
  );
}
