"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelScheduledMailCampaign,
  fetchMailCampaigns,
  resendMailCampaign,
  type MailCampaignListItem,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  open: boolean;
};

export function MailCampaignHistoryPanel({ accessToken, open }: Props) {
  const [rows, setRows] = useState<MailCampaignListItem[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await fetchMailCampaigns(accessToken, 25);
      setRows(data.campaigns);
    } catch {
      setError("Kampanya geçmişi yüklenemedi.");
    }
  }, [accessToken]);

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open, load]);

  if (!open) {
    return null;
  }

  return (
    <div className="mail-campaign-history">
      <h3 className="mail-deliverability-subhead">Kampanya geçmişi</h3>
      {error ? <p className="login-error">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="compose-attach-hint">Henüz kayıtlı kampanya yok.</p>
      ) : (
        <ul className="mail-campaign-history-list">
          {rows.map((row) => (
            <li key={row.id} className="mail-campaign-history-item">
              <div className="mail-campaign-history-head">
                <strong>{row.subject}</strong>
                <span className="mail-campaign-history-status">{row.status}</span>
              </div>
              <p className="compose-attach-hint">
                {row.recipientCount} alıcı ·{" "}
                {new Date(row.createdAt).toLocaleString("tr-TR")}
                {row.scheduleAt
                  ? ` · plan: ${new Date(row.scheduleAt).toLocaleString("tr-TR")}`
                  : ""}
                {row.result
                  ? ` · gönderilen ${row.result.sent}/${row.result.attempted}`
                  : ""}
              </p>
              <div className="mail-campaign-history-actions">
                {row.status === "scheduled" ? (
                  <button
                    type="button"
                    className="compose-chip-btn"
                    disabled={busyId === row.id}
                    onClick={() => {
                      setBusyId(row.id);
                      void cancelScheduledMailCampaign(accessToken, row.id)
                        .then(() => load())
                        .finally(() => setBusyId(null));
                    }}
                  >
                    İptal
                  </button>
                ) : null}
                {row.status === "completed" ? (
                  <button
                    type="button"
                    className="compose-chip-btn"
                    disabled={busyId === row.id}
                    onClick={() => {
                      setBusyId(row.id);
                      void resendMailCampaign(accessToken, row.id)
                        .then(() => load())
                        .finally(() => setBusyId(null));
                    }}
                  >
                    Tekrar gönder
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
