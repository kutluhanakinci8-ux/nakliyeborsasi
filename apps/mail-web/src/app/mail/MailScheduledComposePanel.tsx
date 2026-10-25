"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelDelayedCompose,
  fetchScheduledCompose,
  type MailScheduledComposeItem,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
};

export function MailScheduledComposePanel({ accessToken }: Props) {
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
      <h3 className="mail-help-topic-title">Zamanlanmış gönderimler</h3>
      {pending.length === 0 ? (
        <p className="mail-accounts-muted">Bekleyen zamanlanmış gönderim yok.</p>
      ) : (
        <ul className="mail-exchange-account-list">
          {pending.map((row) => (
            <li key={row.id}>
              <strong>{row.summary}</strong>
              <span className="mail-accounts-muted">
                {new Date(row.sendAt).toLocaleString("tr-TR")} · {row.kind}
              </span>
              <button
                type="button"
                className="mail-premium-btn"
                onClick={() =>
                  void cancelDelayedCompose(accessToken, row.id)
                    .then(() => reload())
                    .then(() => setStatus("Zamanlanmış gönderim iptal edildi."))
                }
              >
                İptal
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
