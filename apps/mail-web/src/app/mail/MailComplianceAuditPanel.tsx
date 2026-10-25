"use client";

import { useMailLocale } from "@/lib/MailLocaleProvider";
import { useCallback, useEffect, useState } from "react";
import {
  downloadMailSendLogCsv,
  fetchMailComplianceAudit,
  type MailComplianceAuditEntry,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
};

export function MailComplianceAuditPanel({ accessToken }: Props) {
  const { t, localeTag } = useMailLocale();
  const [category, setCategory] = useState<"all" | "send" | "security">("send");
  const [logs, setLogs] = useState<MailComplianceAuditEntry[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(
    async (before?: string) => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchMailComplianceAudit(accessToken, {
          category,
          before,
          limit: 40,
        });
        setLogs((prev) => (before ? [...prev, ...data.logs] : data.logs));
        setNextBefore(data.nextBefore);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("complianceErrLoad"));
      } finally {
        setLoading(false);
      }
    },
    [accessToken, category],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mail-posta-card mail-compliance-panel">
      <header className="mail-posta-card-head">
        <h3 className="mail-posta-card-title">{t("complianceTitle")}</h3>
        <p className="mail-posta-card-desc">
          {t("complianceDesc")}
        </p>
      </header>

      <div className="mail-compliance-toolbar">
        <label className="mail-compliance-filter">
          <span>{t("complianceCategory")}</span>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as "all" | "send" | "security")
            }
          >
            <option value="send">{t("complianceCatSend")}</option>
            <option value="security">{t("complianceCatSecurity")}</option>
            <option value="all">{t("complianceCatAll")}</option>
          </select>
        </label>
        <button
          type="button"
          className="mail-premium-btn mail-premium-btn--ghost"
          disabled={exporting}
          onClick={() =>
            void (async () => {
              setExporting(true);
              try {
                await downloadMailSendLogCsv(accessToken);
              } catch (err) {
                setError(err instanceof Error ? err.message : t("complianceErrCsv"));
              } finally {
                setExporting(false);
              }
            })()
          }
        >
          {exporting ? t("privacyPreparing") : t("complianceCsv")}
        </button>
      </div>

      {error ? (
        <p className="mail-accounts-status mail-accounts-status--err" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="mail-compliance-log-list">
        {logs.map((row) => (
          <li key={row.id} className="mail-compliance-log-row">
            <time dateTime={row.createdAt}>
              {new Date(row.createdAt).toLocaleString(localeTag)}
            </time>
            <strong>{row.labelTr}</strong>
            <span>{row.summaryTr}</span>
            <small>{row.actorEmail ?? t("complianceActorSystem")}</small>
          </li>
        ))}
      </ul>

      {loading ? <p className="mail-accounts-muted">{t("readLoading")}</p> : null}
      {nextBefore ? (
        <button
          type="button"
          className="mail-premium-btn mail-premium-btn--ghost"
          disabled={loading}
          onClick={() => void load(nextBefore)}
        >
          {t("complianceLoadMore")}
        </button>
      ) : null}
    </section>
  );
}
