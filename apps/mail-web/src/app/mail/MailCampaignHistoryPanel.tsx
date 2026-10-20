"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelScheduledMailCampaign,
  cloneMailCampaignToCompose,
  cloneMailCampaignSchedule,
  downloadMailCampaignCsv,
  fetchMailCampaignDetail,
  fetchMailCampaigns,
  fetchMailCampaignSummary,
  resendFailedMailCampaign,
  resendMailCampaign,
  type MailCampaignDetail,
  type MailCampaignListItem,
  type MailCampaignSummary,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  open: boolean;
  onCloneToCompose?: (
    compose: import("@/lib/mailApi").MailCampaignComposeClone,
  ) => void;
};

const STATUS_FILTERS = [
  { value: "", label: "Tümü" },
  { value: "scheduled", label: "Zamanlanmış" },
  { value: "completed", label: "Tamamlanan" },
  { value: "failed", label: "Başarısız" },
  { value: "cancelled", label: "İptal" },
];

export function MailCampaignHistoryPanel({
  accessToken,
  open,
  onCloneToCompose,
}: Props) {
  const [rows, setRows] = useState<MailCampaignListItem[]>([]);
  const [summary, setSummary] = useState<MailCampaignSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailCampaignDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [scheduleCloneId, setScheduleCloneId] = useState<string | null>(null);
  const [scheduleCloneAt, setScheduleCloneAt] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [listData, summaryData] = await Promise.all([
        fetchMailCampaigns(
          accessToken,
          25,
          statusFilter || undefined,
          tagFilter || undefined,
        ),
        fetchMailCampaignSummary(accessToken),
      ]);
      setRows(listData.campaigns);
      setSummary(summaryData.summary);
    } catch {
      setError("Kampanya geçmişi yüklenemedi.");
    }
  }, [accessToken, statusFilter, tagFilter]);

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open, load]);

  const tagOptions = summary?.availableTags ?? [];

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

  async function onDownloadCsv(campaignId: string) {
    setBusyId(campaignId);
    try {
      const { blob, filename } = await downloadMailCampaignCsv(
        accessToken,
        campaignId,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("CSV indirilemedi.");
    } finally {
      setBusyId(null);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="mail-campaign-history">
      <h3 className="mail-deliverability-subhead">Kampanya geçmişi</h3>
      {summary ? (
        <p className="mail-campaign-summary compose-attach-hint">
          Son {summary.windowDays} gün: {summary.campaignsInWindow} kampanya ·{" "}
          {summary.recipientsInWindow} alıcı · {summary.sentInWindow} gönderim
          {summary.counts.scheduled > 0
            ? ` · ${summary.counts.scheduled} zamanlanmış`
            : ""}
          {summary.counts.failed > 0
            ? ` · ${summary.counts.failed} başarısız`
            : ""}
        </p>
      ) : null}
      <div className="mail-campaign-history-filters">
        <label className="compose-preset-label">
          <span>Durum filtresi</span>
          <select
            className="compose-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="compose-preset-label">
          <span>Etiket</span>
          <select
            className="compose-select"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            disabled={tagOptions.length === 0}
          >
            <option value="">Tümü</option>
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </div>
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
                {row.tags && row.tags.length > 0
                  ? ` · ${row.tags.join(", ")}`
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
                <button
                  type="button"
                  className="compose-chip-btn"
                  disabled={busyId === row.id}
                  onClick={() => void onDownloadCsv(row.id)}
                >
                  CSV
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
                <button
                  type="button"
                  className="compose-chip-btn"
                  onClick={() => {
                    setScheduleCloneId(
                      scheduleCloneId === row.id ? null : row.id,
                    );
                    setScheduleCloneAt("");
                  }}
                >
                  Zamanla (kopya)
                </button>
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
                  <>
                    {(row.failedRecipientCount ?? row.result?.failed?.length ?? 0) >
                    0 ? (
                      <button
                        type="button"
                        className="compose-chip-btn"
                        disabled={busyId === row.id}
                        onClick={() => {
                          setBusyId(row.id);
                          void resendFailedMailCampaign(accessToken, row.id)
                            .then(() => load())
                            .finally(() => setBusyId(null));
                        }}
                      >
                        Başarısızları yeniden gönder
                      </button>
                    ) : null}
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
                  </>
                ) : null}
              </div>
              {scheduleCloneId === row.id ? (
                <div className="mail-campaign-schedule-clone">
                  <input
                    type="datetime-local"
                    className="compose-input"
                    value={scheduleCloneAt}
                    onChange={(e) => setScheduleCloneAt(e.target.value)}
                  />
                  <button
                    type="button"
                    className="compose-chip-btn"
                    disabled={!scheduleCloneAt || busyId === row.id}
                    onClick={() => {
                      setBusyId(row.id);
                      void cloneMailCampaignSchedule(
                        accessToken,
                        row.id,
                        new Date(scheduleCloneAt).toISOString(),
                      )
                        .then(() => {
                          setScheduleCloneId(null);
                          setScheduleCloneAt("");
                          return load();
                        })
                        .finally(() => setBusyId(null));
                    }}
                  >
                    Kaydet
                  </button>
                </div>
              ) : null}
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
