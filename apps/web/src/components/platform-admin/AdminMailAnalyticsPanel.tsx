"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlatformAdminApiClient,
  type EmailOutboxAnalyticsSummary,
  type EmailOutboxDailyPoint,
  type EmailOutboxEventBreakdownRow,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";

const EVENT_LABELS: Record<string, string> = {
  USER_REGISTERED: "Yeni kayıt",
  USER_LOGIN: "Her giriş",
  USER_FIRST_LOGIN: "İlk giriş",
  EMAIL_VERIFICATION: "E-posta doğrulama",
  PASSWORD_RESET: "Şifre sıfırlama",
};

type RangeDays = 7 | 30;

function formatPercent(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${value.toFixed(1)}%`;
}

function deltaLabel(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "+100%" : "—";
  }
  const change = ((current - previous) / previous) * 100;
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(0)}%`;
}

export function AdminMailAnalyticsPanel() {
  const { accessToken } = useWebSession();
  const [range, setRange] = useState<RangeDays>(30);
  const [summary, setSummary] = useState<EmailOutboxAnalyticsSummary | null>(
    null,
  );
  const [series, setSeries] = useState<EmailOutboxDailyPoint[]>([]);
  const [events, setEvents] = useState<EmailOutboxEventBreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const [nextSummary, nextSeries, nextEvents] = await Promise.all([
        PlatformAdminApiClient.fetchEmailAnalyticsSummary(accessToken, range),
        PlatformAdminApiClient.fetchEmailAnalyticsDaily(accessToken, range),
        PlatformAdminApiClient.fetchEmailAnalyticsEvents(accessToken, range),
      ]);
      setSummary(nextSummary);
      setSeries(nextSeries);
      setEvents(nextEvents);
    } finally {
      setLoading(false);
    }
  }, [accessToken, range]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const chartMax = useMemo(() => {
    let max = 1;
    for (const point of series) {
      max = Math.max(max, point.enqueued, point.sent, point.failed);
    }
    return max;
  }, [series]);

  async function downloadCsv(): Promise<void> {
    if (!accessToken) {
      return;
    }
    setExporting(true);
    try {
      const blob = await PlatformAdminApiClient.fetchEmailOutboxExportBlob(
        accessToken,
        { days: range },
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lerta-outbox-${range}d.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="pa-mail-analytics">
      <div className="pa-toolbar pa-mail-analytics-toolbar">
        <div className="pa-segmented" role="tablist" aria-label="Tarih aralığı">
          <button
            type="button"
            className={range === 7 ? "pa-segmented-btn is-active" : "pa-segmented-btn"}
            onClick={() => setRange(7)}
          >
            7 gün
          </button>
          <button
            type="button"
            className={range === 30 ? "pa-segmented-btn is-active" : "pa-segmented-btn"}
            onClick={() => setRange(30)}
          >
            30 gün
          </button>
        </div>
        <button
          type="button"
          className="pa-btn pa-btn--secondary"
          disabled={exporting}
          onClick={() => void downloadCsv()}
        >
          {exporting ? "İndiriliyor…" : "CSV dışa aktar"}
        </button>
        <button
          type="button"
          className="pa-btn pa-btn--ghost"
          onClick={() => void refresh()}
        >
          Yenile
        </button>
      </div>

      {summary ? (
        <section className="pa-panel pa-maturity-panel">
          <h2 className="pa-panel-title">Platform olgunluk skoru (e-posta)</h2>
          <p className="pa-panel-lead">
            Rakip ESP seviyesi %100 hedef; F1 outbox analitiği ile temel raporlama
            tamamlandı. F2–F4: açılma/tıklama, bounce webhook, org tercihleri.
          </p>
          <div className="pa-maturity-bar-wrap">
            <div
              className="pa-maturity-bar"
              style={{ width: `${summary.maturityScorePercent}%` }}
            />
          </div>
          <p className="pa-maturity-label">
            <strong>{summary.maturityScorePercent}%</strong> / {summary.maturityTargetPercent}% — {summary.maturityPhase}
          </p>
        </section>
      ) : null}

      <section className="pa-metric-row" aria-label="Dönem özetleri">
        <article className="pa-metric">
          <p className="pa-metric-label">Kuyruğa alınan</p>
          <p className="pa-metric-value">{summary?.enqueued ?? "—"}</p>
          <p className="pa-metric-hint">
            Önceki dönem: {summary?.previousPeriod.enqueued ?? "—"}{" "}
            {summary
              ? `(${deltaLabel(summary.enqueued, summary.previousPeriod.enqueued)})`
              : ""}
          </p>
        </article>
        <article className="pa-metric">
          <p className="pa-metric-label">Gönderildi</p>
          <p className="pa-metric-value">{summary?.sent ?? "—"}</p>
          <p className="pa-metric-hint">
            Önceki: {summary?.previousPeriod.sent ?? "—"}
          </p>
        </article>
        <article className="pa-metric">
          <p className="pa-metric-label">Başarı oranı</p>
          <p className="pa-metric-value">
            {formatPercent(summary?.successRatePercent ?? null)}
          </p>
          <p className="pa-metric-hint">
            Önceki: {formatPercent(summary?.previousPeriod.successRatePercent ?? null)}
          </p>
        </article>
        <article className="pa-metric">
          <p className="pa-metric-label">Ort. kuyruk süresi</p>
          <p className="pa-metric-value">
            {summary?.avgQueueSeconds != null
              ? `${summary.avgQueueSeconds}s`
              : "—"}
          </p>
          <p className="pa-metric-hint">sentAt − createdAt</p>
        </article>
      </section>

      <section className="pa-panel">
        <h2 className="pa-panel-title">Günlük hacim ({range} gün)</h2>
        <p className="pa-panel-lead">
          Kuyruğa alınan, gönderilen ve başarısız kayıtlar (oluşturulma günü).
        </p>
        {loading ? (
          <p className="module-hint">Analitik yükleniyor…</p>
        ) : (
          <div className="pa-chart" role="img" aria-label="Günlük gönderim grafiği">
            {series.map((point) => (
              <div key={point.day} className="pa-chart-col">
                <div className="pa-chart-bars">
                  <span
                    className="pa-chart-bar pa-chart-bar--enqueued"
                    style={{ height: `${(point.enqueued / chartMax) * 100}%` }}
                    title={`Kuyruk: ${point.enqueued}`}
                  />
                  <span
                    className="pa-chart-bar pa-chart-bar--sent"
                    style={{ height: `${(point.sent / chartMax) * 100}%` }}
                    title={`Gönderildi: ${point.sent}`}
                  />
                  <span
                    className="pa-chart-bar pa-chart-bar--failed"
                    style={{ height: `${(point.failed / chartMax) * 100}%` }}
                    title={`Başarısız: ${point.failed}`}
                  />
                </div>
                <span className="pa-chart-day">
                  {point.day.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
        <ul className="pa-chart-legend">
          <li><span className="pa-legend-swatch pa-chart-bar--enqueued" /> Kuyruk</li>
          <li><span className="pa-legend-swatch pa-chart-bar--sent" /> Gönderildi</li>
          <li><span className="pa-legend-swatch pa-chart-bar--failed" /> Başarısız</li>
        </ul>
      </section>

      <section className="pa-panel">
        <h2 className="pa-panel-title">Olay bazlı dağılım</h2>
        <p className="pa-panel-lead">Seçili dönemde eventCode kırılımı.</p>
        <div className="admin-data-table-wrap">
          <table className="pa-outbox-table">
            <thead>
              <tr>
                <th>Olay</th>
                <th>Toplam</th>
                <th>Gönderildi</th>
                <th>Başarısız</th>
                <th>Bekleyen</th>
                <th>Başarı %</th>
              </tr>
            </thead>
            <tbody>
              {events.map((row) => {
                const attempted = row.sent + row.failed;
                const rate =
                  attempted > 0
                    ? Math.round((row.sent / attempted) * 1000) / 10
                    : null;
                return (
                  <tr key={row.eventCode}>
                    <td>
                      <strong>
                        {EVENT_LABELS[row.eventCode] ?? row.eventCode}
                      </strong>
                      <br />
                      <code style={{ fontSize: "0.72rem" }}>{row.eventCode}</code>
                    </td>
                    <td>{row.total}</td>
                    <td>{row.sent}</td>
                    <td>{row.failed}</td>
                    <td>{row.pending}</td>
                    <td>{formatPercent(rate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {events.length === 0 && !loading ? (
            <p className="module-hint" style={{ padding: 16 }}>
              Bu dönemde kayıt yok.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
