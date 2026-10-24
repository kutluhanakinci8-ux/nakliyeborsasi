"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelScheduledMailCampaign,
  rescheduleMailCampaign,
  cloneMailCampaignToCompose,
  cloneMailCampaignSchedule,
  downloadMailCampaignCsv,
  downloadMailCampaignListCsv,
  downloadMailCampaignSummaryCsv,
  fetchMailCampaignDetail,
  fetchMailCampaigns,
  fetchMailCampaignSummary,
  updateMailCampaignTags,
  updateScheduledMailCampaignContent,
  bulkCancelScheduledMailCampaigns,
  resendFailedMailCampaign,
  resendMailCampaign,
  sendMailCampaignDraft,
  type MailCampaignDetail,
  type MailCampaignListItem,
  type MailCampaignListPagination,
  type MailCampaignSummary,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  open: boolean;
  onCloneToCompose?: (
    compose: import("@/lib/mailApi").MailCampaignComposeClone,
  ) => void;
};

function dateRangeStart(date: string): string | undefined {
  if (!date) {
    return undefined;
  }
  return new Date(`${date}T00:00:00`).toISOString();
}

function dateRangeEnd(date: string): string | undefined {
  if (!date) {
    return undefined;
  }
  return new Date(`${date}T23:59:59.999`).toISOString();
}

const STATUS_FILTERS = [
  { value: "", label: "Tümü" },
  { value: "draft", label: "Taslak" },
  { value: "scheduled", label: "Zamanlanmış" },
  { value: "running", label: "Gönderiliyor" },
  { value: "completed", label: "Tamamlanan" },
  { value: "failed", label: "Başarısız" },
  { value: "cancelled", label: "İptal" },
];

const STATUS_CHART_COLORS: Record<string, string> = {
  completed: "#16a34a",
  draft: "#8b5cf6",
  scheduled: "#2563eb",
  running: "#ca8a04",
  failed: "#dc2626",
  cancelled: "#64748b",
};

function MailCampaignSummaryCharts({
  summary,
}: {
  summary: MailCampaignSummary;
}) {
  const statusRows = (
    ["completed", "draft", "scheduled", "running", "failed", "cancelled"] as const
  )
    .map((key) => ({
      key,
      label:
        STATUS_FILTERS.find((f) => f.value === key)?.label ?? key,
      value: summary.counts[key] ?? 0,
      color: STATUS_CHART_COLORS[key] ?? "#94a3b8",
    }))
    .filter((row) => row.value > 0);
  const maxStatus = Math.max(1, ...statusRows.map((row) => row.value));
  const tagRows = Object.entries(summary.tagCountsInWindow ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxTag = Math.max(1, ...tagRows.map(([, count]) => count));

  return (
    <div className="mail-campaign-chart-grid" aria-label="30 günlük kampanya grafikleri">
      <div className="mail-campaign-chart-card">
        <h4 className="mail-campaign-chart-title">Durum (30 gün)</h4>
        {statusRows.length === 0 ? (
          <p className="compose-attach-hint">Bu pencerede kampanya yok.</p>
        ) : (
          <ul className="mail-campaign-chart-bars">
            {statusRows.map((row) => (
              <li key={row.key}>
                <span className="mail-campaign-chart-label">{row.label}</span>
                <div className="mail-campaign-chart-track">
                  <div
                    className="mail-campaign-chart-fill"
                    style={{
                      width: `${Math.round((row.value / maxStatus) * 100)}%`,
                      background: row.color,
                    }}
                  />
                </div>
                <span className="mail-campaign-chart-value">{row.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mail-campaign-chart-card">
        <h4 className="mail-campaign-chart-title">Etiketler (30 gün)</h4>
        {tagRows.length === 0 ? (
          <p className="compose-attach-hint">Etiketli kampanya yok.</p>
        ) : (
          <ul className="mail-campaign-chart-bars">
            {tagRows.map(([tag, count]) => (
              <li key={tag}>
                <span className="mail-campaign-chart-label">{tag}</span>
                <div className="mail-campaign-chart-track">
                  <div
                    className="mail-campaign-chart-fill"
                    style={{
                      width: `${Math.round((count / maxTag) * 100)}%`,
                      background: "#4f46e5",
                    }}
                  />
                </div>
                <span className="mail-campaign-chart-value">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function MailCampaignHistoryPanel({
  accessToken,
  open,
  onCloneToCompose,
}: Props) {
  const [rows, setRows] = useState<MailCampaignListItem[]>([]);
  const [summary, setSummary] = useState<MailCampaignSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [debouncedSubjectQ, setDebouncedSubjectQ] = useState("");
  const [pagination, setPagination] =
    useState<MailCampaignListPagination | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailCampaignDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [scheduleCloneId, setScheduleCloneId] = useState<string | null>(null);
  const [scheduleCloneAt, setScheduleCloneAt] = useState("");
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [scheduleFrom, setScheduleFrom] = useState("");
  const [scheduleTo, setScheduleTo] = useState("");
  const [sortFilter, setSortFilter] = useState<"createdAt" | "scheduleAt">(
    "createdAt",
  );
  const [tagsEditId, setTagsEditId] = useState<string | null>(null);
  const [tagsDraft, setTagsDraft] = useState("");
  const [listExportBusy, setListExportBusy] = useState(false);
  const [contentEditId, setContentEditId] = useState<string | null>(null);
  const [contentSubject, setContentSubject] = useState("");
  const [contentText, setContentText] = useState("");
  const [contentSubjectB, setContentSubjectB] = useState("");
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [hasFailuresOnly, setHasFailuresOnly] = useState(false);
  const [summaryExportBusy, setSummaryExportBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSubjectQ(subjectSearch.trim()),
      400,
    );
    return () => window.clearTimeout(timer);
  }, [subjectSearch]);

  const loadList = useCallback(
    async (offset: number, append: boolean) => {
      setError("");
      try {
        const listData = await fetchMailCampaigns(
          accessToken,
          25,
          statusFilter || undefined,
          tagFilter || undefined,
          debouncedSubjectQ || undefined,
          offset,
          dateRangeStart(createdFrom),
          dateRangeEnd(createdTo),
          sortFilter,
          hasFailuresOnly || undefined,
          dateRangeStart(scheduleFrom),
          dateRangeEnd(scheduleTo),
        );
        setRows((prev) =>
          append ? [...prev, ...listData.campaigns] : listData.campaigns,
        );
        setPagination(listData.pagination);
      } catch {
        setError("Kampanya geçmişi yüklenemedi.");
      }
    },
    [
      accessToken,
      statusFilter,
      tagFilter,
      debouncedSubjectQ,
      createdFrom,
      createdTo,
      sortFilter,
      hasFailuresOnly,
      scheduleFrom,
      scheduleTo,
    ],
  );

  const refresh = useCallback(async () => {
    setError("");
    try {
      const summaryData = await fetchMailCampaignSummary(accessToken);
      setSummary(summaryData.summary);
      await loadList(0, false);
    } catch {
      setError("Kampanya geçmişi yüklenemedi.");
    }
  }, [accessToken, loadList]);

  useEffect(() => {
    if (open) {
      void refresh();
    }
  }, [open, refresh]);

  async function loadMore() {
    if (!pagination?.hasMore || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      await loadList(pagination.offset + pagination.limit, true);
    } finally {
      setLoadingMore(false);
    }
  }

  const tagOptions = summary?.availableTags ?? [];
  const topTagCounts = summary?.tagCountsInWindow
    ? Object.entries(summary.tagCountsInWindow)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
    : [];

  async function onDownloadListCsv() {
    setListExportBusy(true);
    setError("");
    try {
      const { blob, filename } = await downloadMailCampaignListCsv(
        accessToken,
        {
          status: statusFilter || undefined,
          tag: tagFilter || undefined,
          q: debouncedSubjectQ || undefined,
          createdAfter: dateRangeStart(createdFrom),
          createdBefore: dateRangeEnd(createdTo),
          sort: sortFilter,
          hasFailures: hasFailuresOnly || undefined,
          scheduleAfter: dateRangeStart(scheduleFrom),
          scheduleBefore: dateRangeEnd(scheduleTo),
        },
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Liste CSV indirilemedi.");
    } finally {
      setListExportBusy(false);
    }
  }

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

  async function openContentEditor(campaignId: string) {
    if (contentEditId === campaignId) {
      setContentEditId(null);
      return;
    }
    setContentEditId(campaignId);
    setRescheduleId(null);
    setTagsEditId(null);
    setScheduleCloneId(null);
    setBusyId(campaignId);
    try {
      const data = await fetchMailCampaignDetail(accessToken, campaignId);
      setContentSubject(data.campaign.subject);
      setContentSubjectB(data.campaign.subjectB ?? "");
      setContentText(data.campaign.text);
    } catch {
      setError("İçerik yüklenemedi.");
      setContentEditId(null);
    } finally {
      setBusyId(null);
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
          {summary.failedRecipientsInWindow > 0
            ? ` · ${summary.failedRecipientsInWindow} başarısız alıcı`
            : ""}
          {summary.suppressedSkippedInWindow > 0
            ? ` · ${summary.suppressedSkippedInWindow} durdurulmuş atlandı`
            : ""}
          {summary.averageSuccessRatePercent != null
            ? ` · ort. başarı ${summary.averageSuccessRatePercent}%`
            : ""}
          {topTagCounts.length > 0
            ? ` · etiket: ${topTagCounts
                .map(([tag, count]) => `${tag} (${count})`)
                .join(", ")}`
            : ""}
        </p>
      ) : null}
      {summary ? <MailCampaignSummaryCharts summary={summary} /> : null}
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
        <label className="compose-preset-label mail-campaign-history-search">
          <span>Konu ara</span>
          <input
            type="search"
            className="compose-input"
            placeholder="En az 2 karakter"
            value={subjectSearch}
            onChange={(e) => setSubjectSearch(e.target.value)}
          />
        </label>
        <label className="compose-preset-label">
          <span>Başlangıç</span>
          <input
            type="date"
            className="compose-input"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
          />
        </label>
        <label className="compose-preset-label">
          <span>Bitiş</span>
          <input
            type="date"
            className="compose-input"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
          />
        </label>
        <label className="compose-preset-label">
          <span>Plan (başlangıç)</span>
          <input
            type="date"
            className="compose-input"
            value={scheduleFrom}
            onChange={(e) => setScheduleFrom(e.target.value)}
          />
        </label>
        <label className="compose-preset-label">
          <span>Plan (bitiş)</span>
          <input
            type="date"
            className="compose-input"
            value={scheduleTo}
            onChange={(e) => setScheduleTo(e.target.value)}
          />
        </label>
        <label className="compose-preset-label mail-campaign-history-check">
          <span>Başarısız alıcı</span>
          <input
            type="checkbox"
            checked={hasFailuresOnly}
            onChange={(e) => setHasFailuresOnly(e.target.checked)}
          />
        </label>
        <label className="compose-preset-label">
          <span>Sıralama</span>
          <select
            className="compose-select"
            value={sortFilter}
            onChange={(e) =>
              setSortFilter(
                e.target.value === "scheduleAt" ? "scheduleAt" : "createdAt",
              )
            }
          >
            <option value="createdAt">Oluşturma (yeni)</option>
            <option value="scheduleAt">Planlanan tarih</option>
          </select>
        </label>
      </div>
      <div className="mail-campaign-history-toolbar">
        <button
          type="button"
          className="compose-chip-btn"
          disabled={listExportBusy}
          onClick={() => void onDownloadListCsv()}
        >
          {listExportBusy ? "Hazırlanıyor…" : "Filtreli liste CSV"}
        </button>
        <button
          type="button"
          className="compose-chip-btn"
          disabled={summaryExportBusy}
          onClick={() => {
            setSummaryExportBusy(true);
            void downloadMailCampaignSummaryCsv(accessToken)
              .then(({ blob, filename }) => {
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = filename;
                anchor.click();
                URL.revokeObjectURL(url);
              })
              .catch(() => setError("Özet CSV indirilemedi."))
              .finally(() => setSummaryExportBusy(false));
          }}
        >
          {summaryExportBusy ? "Hazırlanıyor…" : "30g özet CSV"}
        </button>
        <button
          type="button"
          className="compose-chip-btn"
          onClick={() => {
            setBulkSelectMode((value) => !value);
            setBulkSelected([]);
          }}
        >
          {bulkSelectMode ? "Toplu iptal: kapalı" : "Toplu iptal"}
        </button>
        {bulkSelectMode && bulkSelected.length > 0 ? (
          <button
            type="button"
            className="compose-chip-btn"
            disabled={bulkBusy}
            onClick={() => {
              setBulkBusy(true);
              void bulkCancelScheduledMailCampaigns(accessToken, bulkSelected)
                .then(() => {
                  setBulkSelected([]);
                  setBulkSelectMode(false);
                  return refresh();
                })
                .catch(() => setError("Toplu iptal başarısız."))
                .finally(() => setBulkBusy(false));
            }}
          >
            {bulkBusy
              ? "İptal ediliyor…"
              : `Seçilenleri iptal (${bulkSelected.length})`}
          </button>
        ) : null}
      </div>
      {error ? <p className="login-error">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="compose-attach-hint">Henüz kayıtlı kampanya yok.</p>
      ) : (
        <ul className="mail-campaign-history-list">
          {rows.map((row) => (
            <li key={row.id} className="mail-campaign-history-item">
              <div className="mail-campaign-history-head">
                {bulkSelectMode && row.status === "scheduled" ? (
                  <input
                    type="checkbox"
                    className="mail-campaign-bulk-check"
                    checked={bulkSelected.includes(row.id)}
                    onChange={(e) => {
                      setBulkSelected((prev) =>
                        e.target.checked
                          ? [...prev, row.id]
                          : prev.filter((id) => id !== row.id),
                      );
                    }}
                  />
                ) : null}
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
                {row.successRatePercent != null
                  ? ` · başarı ${row.successRatePercent}%`
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
                {row.status !== "running" ? (
                  <button
                    type="button"
                    className="compose-chip-btn"
                    onClick={() => {
                      setTagsEditId(tagsEditId === row.id ? null : row.id);
                      setTagsDraft((row.tags ?? []).join(", "));
                    }}
                  >
                    Etiket
                  </button>
                ) : null}
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
                {row.status === "draft" ? (
                  <button
                    type="button"
                    className="compose-chip-btn"
                    disabled={busyId === row.id}
                    onClick={() => {
                      setBusyId(row.id);
                      void sendMailCampaignDraft(accessToken, row.id)
                        .then(() => refresh())
                        .finally(() => setBusyId(null));
                    }}
                  >
                    Gönder
                  </button>
                ) : null}
                {row.status === "scheduled" ? (
                  <>
                    <button
                      type="button"
                      className="compose-chip-btn"
                      onClick={() => void openContentEditor(row.id)}
                    >
                      {contentEditId === row.id ? "İçeriği gizle" : "İçerik"}
                    </button>
                    <button
                      type="button"
                      className="compose-chip-btn"
                      onClick={() => {
                        setRescheduleId(rescheduleId === row.id ? null : row.id);
                        setRescheduleAt("");
                        setScheduleCloneId(null);
                        setContentEditId(null);
                      }}
                    >
                      Yeniden zamanla
                    </button>
                    <button
                      type="button"
                      className="compose-chip-btn"
                      disabled={busyId === row.id}
                      onClick={() => {
                        setBusyId(row.id);
                        void cancelScheduledMailCampaign(accessToken, row.id)
                          .then(() => refresh())
                          .finally(() => setBusyId(null));
                      }}
                    >
                      İptal
                    </button>
                  </>
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
                            .then(() => refresh())
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
                          .then(() => refresh())
                          .finally(() => setBusyId(null));
                      }}
                    >
                      Tekrar gönder
                    </button>
                  </>
                ) : null}
              </div>
              {contentEditId === row.id ? (
                <div className="mail-campaign-content-edit">
                  <input
                    type="text"
                    className="compose-input"
                    placeholder="Konu"
                    value={contentSubject}
                    onChange={(e) => setContentSubject(e.target.value)}
                  />
                  <input
                    type="text"
                    className="compose-input"
                    placeholder="A/B konu (B)"
                    value={contentSubjectB}
                    onChange={(e) => setContentSubjectB(e.target.value)}
                  />
                  <textarea
                    className="compose-input mail-campaign-content-text"
                    rows={5}
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                  />
                  <button
                    type="button"
                    className="compose-chip-btn"
                    disabled={!contentSubject.trim() || !contentText.trim() || busyId === row.id}
                    onClick={() => {
                      setBusyId(row.id);
                      void updateScheduledMailCampaignContent(accessToken, row.id, {
                        subject: contentSubject.trim(),
                        text: contentText.trim(),
                        subjectB: contentSubjectB.trim() || undefined,
                      })
                        .then(() => {
                          setContentEditId(null);
                          return refresh();
                        })
                        .catch(() => setError("İçerik kaydedilemedi."))
                        .finally(() => setBusyId(null));
                    }}
                  >
                    İçeriği kaydet
                  </button>
                </div>
              ) : null}
              {tagsEditId === row.id ? (
                <div className="mail-campaign-schedule-clone">
                  <input
                    type="text"
                    className="compose-input"
                    placeholder="etiket1, etiket2"
                    value={tagsDraft}
                    onChange={(e) => setTagsDraft(e.target.value)}
                  />
                  <button
                    type="button"
                    className="compose-chip-btn"
                    disabled={busyId === row.id}
                    onClick={() => {
                      setBusyId(row.id);
                      const tags = tagsDraft
                        .split(/[,;]+/)
                        .map((part) => part.trim())
                        .filter(Boolean);
                      void updateMailCampaignTags(accessToken, row.id, tags)
                        .then(() => {
                          setTagsEditId(null);
                          return refresh();
                        })
                        .catch(() => setError("Etiketler kaydedilemedi."))
                        .finally(() => setBusyId(null));
                    }}
                  >
                    Etiketleri kaydet
                  </button>
                </div>
              ) : null}
              {rescheduleId === row.id ? (
                <div className="mail-campaign-schedule-clone">
                  <input
                    type="datetime-local"
                    className="compose-input"
                    value={rescheduleAt}
                    onChange={(e) => setRescheduleAt(e.target.value)}
                  />
                  <button
                    type="button"
                    className="compose-chip-btn"
                    disabled={!rescheduleAt || busyId === row.id}
                    onClick={() => {
                      setBusyId(row.id);
                      void rescheduleMailCampaign(
                        accessToken,
                        row.id,
                        new Date(rescheduleAt).toISOString(),
                      )
                        .then(() => {
                          setRescheduleId(null);
                          setRescheduleAt("");
                          return refresh();
                        })
                        .catch(() => setError("Yeniden zamanlama başarısız."))
                        .finally(() => setBusyId(null));
                    }}
                  >
                    Planı güncelle
                  </button>
                </div>
              ) : null}
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
                          return refresh();
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
                      {detail.engagement && detail.engagement.trackedSends > 0 ? (
                        <p className="compose-attach-hint">
                          İzleme: {detail.engagement.uniqueOpens} açılma ·{" "}
                          {detail.engagement.totalClicks} tıklama (
                          {detail.engagement.trackedSends} HTML gönderim)
                        </p>
                      ) : null}
                      {detail.subjectB ? (
                        <p className="compose-attach-hint">A/B (B): {detail.subjectB}</p>
                      ) : null}
                      {detail.abStats ? (
                        <p className="compose-attach-hint">
                          A/B gönderim: A={detail.abStats.sentVariantA} · B=
                          {detail.abStats.sentVariantB}
                        </p>
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
      {pagination?.hasMore ? (
        <button
          type="button"
          className="compose-chip-btn mail-campaign-history-more"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? "Yükleniyor…" : "Daha fazla göster"}
        </button>
      ) : null}
    </div>
  );
}
