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
  type MailDeliverabilityEngagement,
  fetchDeliverabilityHub,
} from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import { MailCampaignStatsCards } from "./MailCampaignStatsCards";

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

function formatCampaignSummaryLine(
  summary: MailCampaignSummary,
  topTagCounts: [string, number][],
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  let line = t("campaignSummaryWindow", {
    days: summary.windowDays,
    campaigns: summary.campaignsInWindow,
    recipients: summary.recipientsInWindow,
    sent: summary.sentInWindow,
  });
  if (summary.counts.scheduled > 0) {
    line += t("campaignSummaryScheduledSuffix", {
      count: summary.counts.scheduled,
    });
  }
  if (summary.counts.failed > 0) {
    line += t("campaignSummaryFailedSuffix", { count: summary.counts.failed });
  }
  if (summary.failedRecipientsInWindow > 0) {
    line += t("campaignSummaryFailedRecipientsSuffix", {
      count: summary.failedRecipientsInWindow,
    });
  }
  if (summary.suppressedSkippedInWindow > 0) {
    line += t("campaignSummarySuppressedSuffix", {
      count: summary.suppressedSkippedInWindow,
    });
  }
  if (summary.averageSuccessRatePercent != null) {
    line += t("campaignSummaryAvgSuccessSuffix", {
      pct: summary.averageSuccessRatePercent,
    });
  }
  if (topTagCounts.length > 0) {
    line += t("campaignSummaryTagsPrefix", {
      tags: topTagCounts.map(([tag, count]) => `${tag} (${count})`).join(", "),
    });
  }
  return line;
}

function statusFilters(t: (key: string) => string) {
  return [
    { value: "", label: t("campaignFilterAll") },
    { value: "draft", label: t("campaignStatusDraft") },
    { value: "scheduled", label: t("campaignStatusScheduled") },
    { value: "running", label: t("campaignStatusRunning") },
    { value: "completed", label: t("campaignStatusCompleted") },
    { value: "failed", label: t("campaignStatusFailed") },
    { value: "cancelled", label: t("campaignStatusCancelled") },
  ];
}

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
  t,
}: {
  summary: MailCampaignSummary;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const filters = statusFilters(t);
  const statusRows = (
    ["completed", "draft", "scheduled", "running", "failed", "cancelled"] as const
  )
    .map((key) => ({
      key,
      label: filters.find((f) => f.value === key)?.label ?? key,
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
    <div className="mail-campaign-chart-grid" aria-label={t("campaignChartsAria")}>
      <div className="mail-campaign-chart-card">
        <h4 className="mail-campaign-chart-title">{t("campaignChartStatusTitle")}</h4>
        {statusRows.length === 0 ? (
          <p className="compose-attach-hint">{t("campaignChartEmptyStatus")}</p>
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
        <h4 className="mail-campaign-chart-title">{t("campaignChartTagsTitle")}</h4>
        {tagRows.length === 0 ? (
          <p className="compose-attach-hint">{t("campaignChartEmptyTags")}</p>
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
  const { t, localeTag } = useMailLocale();
  const [rows, setRows] = useState<MailCampaignListItem[]>([]);
  const [summary, setSummary] = useState<MailCampaignSummary | null>(null);
  const [engagement, setEngagement] =
    useState<MailDeliverabilityEngagement | null>(null);
  const [loading, setLoading] = useState(false);
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
        setError(t("campaignLoadError"));
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
      t,
    ],
  );

  const refresh = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const summaryData = await fetchMailCampaignSummary(accessToken);
      setSummary(summaryData.summary);
      try {
        const { hub: deliverability } = await fetchDeliverabilityHub(
          accessToken,
          summaryData.summary.windowDays,
        );
        setEngagement(
          deliverability.engagement ??
            deliverability.engagement30d ??
            null,
        );
      } catch {
        setEngagement(null);
      }
      await loadList(0, false);
    } catch {
      setError(t("campaignLoadError"));
    } finally {
      setLoading(false);
    }
  }, [accessToken, loadList, t]);

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
      setError(t("campaignErrListCsv"));
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
      setDetailError(t("campaignErrDetailLoad"));
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
      setError(t("campaignErrContentLoad"));
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
      setError(t("campaignErrCsv"));
    } finally {
      setBusyId(null);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="mail-campaign-history">
      <h3 className="mail-deliverability-subhead">{t("campaignHistoryTitle")}</h3>
      {summary ? (
        <MailCampaignStatsCards
          summary={summary}
          engagement={engagement}
          loading={loading}
        />
      ) : loading ? (
        <MailCampaignStatsCards
          summary={{
            windowDays: 30,
            counts: {
              draft: 0,
              scheduled: 0,
              running: 0,
              completed: 0,
              failed: 0,
              cancelled: 0,
            },
            campaignsInWindow: 0,
            recipientsInWindow: 0,
            sentInWindow: 0,
            failedRecipientsInWindow: 0,
            suppressedSkippedInWindow: 0,
            availableTags: [],
            tagCountsInWindow: {},
            campaignsWithFailuresInWindow: 0,
            averageSuccessRatePercent: null,
          }}
          engagement={null}
          loading
        />
      ) : null}
      {summary ? (
        <p className="mail-campaign-summary compose-attach-hint">
          {formatCampaignSummaryLine(summary, topTagCounts, t)}
        </p>
      ) : null}
      {summary ? <MailCampaignSummaryCharts summary={summary} t={t} /> : null}
      <div className="mail-campaign-history-filters">
        <label className="compose-preset-label">
          <span>{t("campaignFilterStatus")}</span>
          <select
            className="compose-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statusFilters(t).map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="compose-preset-label">
          <span>{t("campaignFilterTag")}</span>
          <select
            className="compose-select"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            disabled={tagOptions.length === 0}
          >
            <option value="">{t("campaignFilterAll")}</option>
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
        <label className="compose-preset-label mail-campaign-history-search">
          <span>{t("campaignFilterSubject")}</span>
          <input
            type="search"
            className="compose-input"
            placeholder={t("campaignFilterSubjectPlaceholder")}
            value={subjectSearch}
            onChange={(e) => setSubjectSearch(e.target.value)}
          />
        </label>
        <label className="compose-preset-label">
          <span>{t("campaignFilterCreatedFrom")}</span>
          <input
            type="date"
            className="compose-input"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
          />
        </label>
        <label className="compose-preset-label">
          <span>{t("campaignFilterCreatedTo")}</span>
          <input
            type="date"
            className="compose-input"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
          />
        </label>
        <label className="compose-preset-label">
          <span>{t("campaignFilterScheduleFrom")}</span>
          <input
            type="date"
            className="compose-input"
            value={scheduleFrom}
            onChange={(e) => setScheduleFrom(e.target.value)}
          />
        </label>
        <label className="compose-preset-label">
          <span>{t("campaignFilterScheduleTo")}</span>
          <input
            type="date"
            className="compose-input"
            value={scheduleTo}
            onChange={(e) => setScheduleTo(e.target.value)}
          />
        </label>
        <label className="compose-preset-label mail-campaign-history-check">
          <span>{t("campaignFilterHasFailures")}</span>
          <input
            type="checkbox"
            checked={hasFailuresOnly}
            onChange={(e) => setHasFailuresOnly(e.target.checked)}
          />
        </label>
        <label className="compose-preset-label">
          <span>{t("campaignFilterSort")}</span>
          <select
            className="compose-select"
            value={sortFilter}
            onChange={(e) =>
              setSortFilter(
                e.target.value === "scheduleAt" ? "scheduleAt" : "createdAt",
              )
            }
          >
            <option value="createdAt">{t("campaignSortCreated")}</option>
            <option value="scheduleAt">{t("campaignSortSchedule")}</option>
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
          {listExportBusy ? t("campaignExportPreparing") : t("campaignExportFilteredCsv")}
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
              .catch(() => setError(t("campaignErrSummaryCsv")))
              .finally(() => setSummaryExportBusy(false));
          }}
        >
          {summaryExportBusy
            ? t("campaignExportPreparing")
            : t("campaignSummaryCsv30d")}
        </button>
        <button
          type="button"
          className="compose-chip-btn"
          onClick={() => {
            setBulkSelectMode((value) => !value);
            setBulkSelected([]);
          }}
        >
          {bulkSelectMode ? t("campaignBulkCancelOff") : t("campaignBulkCancelOn")}
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
                .catch(() => setError(t("campaignErrBulkCancel")))
                .finally(() => setBulkBusy(false));
            }}
          >
            {bulkBusy
              ? t("campaignBulkCancelling")
              : t("campaignBulkCancelSelected", { count: bulkSelected.length })}
          </button>
        ) : null}
      </div>
      {error ? <p className="login-error">{error}</p> : null}
      {rows.length === 0 && !loading ? (
        <div className="mail-campaign-empty-state" role="status">
          {t("campaignListEmpty")}
        </div>
      ) : rows.length === 0 ? null : (
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
                {t("campaignRowRecipients", { count: row.recipientCount })} ·{" "}
                {new Date(row.createdAt).toLocaleString(localeTag)}
                {row.scheduleAt
                  ? t("campaignRowScheduled", {
                      when: new Date(row.scheduleAt).toLocaleString(localeTag),
                    })
                  : ""}
                {row.result
                  ? t("campaignRowSent", {
                      sent: row.result.sent,
                      attempted: row.result.attempted,
                    })
                  : ""}
                {row.successRatePercent != null
                  ? t("campaignRowSuccess", { percent: row.successRatePercent })
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
                  {detailId === row.id
                    ? t("campaignDetailHide")
                    : t("campaignDetailShow")}
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
                    {t("campaignTagBtn")}
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
                    {t("campaignCloneToCompose")}
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
                  {t("campaignScheduleClone")}
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
                    {t("composeSend")}
                  </button>
                ) : null}
                {row.status === "scheduled" ? (
                  <>
                    <button
                      type="button"
                      className="compose-chip-btn"
                      onClick={() => void openContentEditor(row.id)}
                    >
                      {contentEditId === row.id
                        ? t("campaignContentHide")
                        : t("campaignContentShow")}
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
                      {t("campaignReschedule")}
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
                      {t("composeCancel")}
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
                        {t("campaignResendFailed")}
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
                      {t("campaignResend")}
                    </button>
                  </>
                ) : null}
              </div>
              {contentEditId === row.id ? (
                <div className="mail-campaign-content-edit">
                  <input
                    type="text"
                    className="compose-input"
                    placeholder={t("campaignSubjectPlaceholder")}
                    value={contentSubject}
                    onChange={(e) => setContentSubject(e.target.value)}
                  />
                  <input
                    type="text"
                    className="compose-input"
                    placeholder={t("campaignSubjectBPlaceholder")}
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
                        .catch(() => setError(t("campaignErrContentSave")))
                        .finally(() => setBusyId(null));
                    }}
                  >
                    {t("campaignContentSave")}
                  </button>
                </div>
              ) : null}
              {tagsEditId === row.id ? (
                <div className="mail-campaign-schedule-clone">
                  <input
                    type="text"
                    className="compose-input"
                    placeholder={t("campaignTagsPlaceholder")}
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
                        .catch(() => setError(t("campaignErrTagsSave")))
                        .finally(() => setBusyId(null));
                    }}
                  >
                    {t("campaignTagsSave")}
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
                        .catch(() => setError(t("campaignErrReschedule")))
                        .finally(() => setBusyId(null));
                    }}
                  >
                    {t("campaignUpdateSchedule")}
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
                    {t("actionSave")}
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
                          {t("campaignEngagementLine", {
                            opens: detail.engagement.uniqueOpens,
                            clicks: detail.engagement.totalClicks,
                            tracked: detail.engagement.trackedSends,
                          })}
                        </p>
                      ) : null}
                      {detail.subjectB ? (
                        <p className="compose-attach-hint">A/B (B): {detail.subjectB}</p>
                      ) : null}
                      {detail.abStats ? (
                        <p className="compose-attach-hint">
                          {t("campaignAbLine", {
                            a: detail.abStats.sentVariantA,
                            b: detail.abStats.sentVariantB,
                          })}
                        </p>
                      ) : null}
                      {detail.segment?.referansAllowlist?.length ? (
                        <p className="compose-attach-hint">
                          {t("campaignRefFilter")}{" "}
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
                    <p className="compose-attach-hint">{t("campaignLoadingMore")}</p>
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
          {loadingMore ? t("campaignLoadingMore") : t("campaignLoadMore")}
        </button>
      ) : null}
    </div>
  );
}
