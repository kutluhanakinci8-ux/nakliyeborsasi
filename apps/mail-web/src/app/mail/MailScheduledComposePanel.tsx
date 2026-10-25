"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelDelayedCompose,
  fetchScheduledCompose,
  type MailScheduledComposeItem,
} from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";

type Props = {
  accessToken: string;
};

export function MailScheduledComposePanel({ accessToken }: Props) {
  const { t, localeTag } = useMailLocale();
  const [pending, setPending] = useState<MailScheduledComposeItem[]>([]);
  const [status, setStatus] = useState("");

  const reload = useCallback(async () => {
    const data = await fetchScheduledCompose(accessToken);
    setPending(data.pending);
  }, [accessToken]);

  useEffect(() => {
    void reload().catch(() => undefined);
  }, [reload]);

  return (
    <section className="mail-posta-card mail-help-topic-card">
      <h3 className="mail-help-topic-title">{t("scheduledTitle")}</h3>
      {pending.length === 0 ? (
        <p className="mail-accounts-muted">{t("scheduledEmpty")}</p>
      ) : (
        <ul className="mail-exchange-account-list">
          {pending.map((row) => (
            <li key={row.id}>
              <strong>{row.summary}</strong>
              <span className="mail-accounts-muted">
                {new Date(row.sendAt).toLocaleString(localeTag)} · {row.kind}
              </span>
              <button
                type="button"
                className="mail-premium-btn"
                onClick={() =>
                  void cancelDelayedCompose(accessToken, row.id)
                    .then(() => reload())
                    .then(() => setStatus(t("scheduledCancelled")))
                }
              >
                {t("composeCancel")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {status ? (
        <p className="mail-accounts-status mail-accounts-status--ok">{status}</p>
      ) : null}
    </section>
  );
}
