"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelScheduledMailCampaign,
  cloneMailCampaignToCompose,
  fetchMailCampaignDetail,
  fetchMailCampaigns,
  resendMailCampaign,
  type MailCampaignDetail,
  type MailCampaignListItem,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  open: boolean;
  onCloneToCompose?: (
    compose: import("@/lib/mailApi").MailCampaignComposeClone,
  ) => void;
};

export function MailCampaignHistoryPanel({
  accessToken,
  open,
  onCloneToCompose,
}: Props) {
  const [rows, setRows] = useState<MailCampaignListItem[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailCampaignDetail | null>(null);
  const [detailError, setDetailError] = useState("");

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

  async function toggleDetail(campaignId: string) {
    if (detailId === campaignId) {
      setDetailId(null);
      setDetail(null);
      setDetailError("");
      return;
    }
    setDetailId(campaignId);
    setDetail(null);
    setDetailError("");
    try {
      const data = await fetchMailCampaignDetail(accessToken, campaignId);
      setDetail(data.campaign);
    } catch {
      setDetailError("Detay yüklenemedi.");
    }
  }

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
                <button
                  type="button"
                  className="compose-chip-btn"
                  onClick={() => void toggleDetail(row.id)}
                >
                  {detailId === row.id ? "Detayı gizle" : "Detay"}
                </button>
                {onCloneToCompose ? (
                  <button
                    type="button"
                    className="compose-chip-btn"
                    disabled={busyId === row.id}
                    onClick={() => {
                      setBusyId(row.id);
                      void cloneMailCampaignToCompose(accessToken, row.id)
                        .then((data) => onCloneToCompose(data.compose))
                        .finally(() => setBusyId(null));
                    }}
                  >
                    Yazıya kopyala
                  </button>
                ) : null}
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
              {detailId === row.id ? (
                <div className="mail-campaign-detail">
                  {detailError ? (
                    <p className="login-error">{detailError}</p>
                  ) : null}
                  {detail && detail.id === row.id ? (
                    <>
                      {detail.subjectB ? (
                        <p className="compose-attach-hint">A/B (B): {detail.subjectB}</p>
                      ) : null}
                      {detail.segment?.referansAllowlist?.length ? (
                        <p className="compose-attach-hint">
                          Referans filtresi:{" "}
                          {detail.segment.referansAllowlist.join(", ")}
                        </p>
                      ) : null}
                      {detail.result?.failed?.length ? (
                        <ul className="mail-campaign-result-failures">
                          {detail.result.failed.map((f) => (
                            <li key={f.email}>
                              {f.email}: {f.error}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <ul className="compose-attach-hint">
                        {detail.recipients.map((r) => (
                          <li key={r.email}>
                            {r.email}
                            {r.referans ? ` · ${r.referans}` : ""}
                            {r.musteriAdi ? ` · ${r.musteriAdi}` : ""}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : !detailError ? (
                    <p className="compose-attach-hint">Yükleniyor…</p>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
