"use client";

import { useEffect, useState } from "react";
import { fetchConnectedAccountAudit } from "@/lib/mailApi";

type Props = {
  accessToken: string;
};

export function MailConnectedAuditPanel({ accessToken }: Props) {
  const [logs, setLogs] = useState<
    Array<{
      id: string;
      labelTr: string;
      summaryTr: string;
      actorEmail: string | null;
      createdAt: string;
    }>
  >([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchConnectedAccountAudit(accessToken)
      .then((data) => setLogs(data.logs))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Denetim kaydı yüklenemedi"),
      );
  }, [accessToken]);

  return (
    <section className="mail-posta-card mail-help-topic-card">
      <h3 className="mail-help-topic-title">Bağlı hesap denetimi (CAP-8)</h3>
      <p className="mail-help-topic-desc">
        Microsoft / Gmail bağlantı ve bağlı hesaptan gönderim olayları.
      </p>
      {error ? (
        <p className="mail-accounts-status mail-accounts-status--err">{error}</p>
      ) : null}
      {logs.length === 0 ? (
        <p className="mail-accounts-muted">Henüz kayıt yok.</p>
      ) : (
        <ul className="mail-exchange-account-list">
          {logs.slice(0, 12).map((row) => (
            <li key={row.id}>
              <strong>{row.labelTr}</strong>
              <span className="mail-accounts-muted">
                {row.actorEmail ?? "—"} ·{" "}
                {new Date(row.createdAt).toLocaleString("tr-TR")}
              </span>
              <div>{row.summaryTr}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
