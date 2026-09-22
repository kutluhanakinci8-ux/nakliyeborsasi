"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  PlatformAdminApiClient,
  type PlatformAdminOverview,
} from "../../lib/PlatformAdminApiClient";
import { flattenPlatformAdminNav } from "../../lib/platformAdminNavigation";
import { useWebSession } from "../../context/WebSessionProvider";
import {
  AdminBarChart,
  AdminDonutChart,
  AdminSparkline,
  buildTrendSeries,
} from "./AdminDashboardCharts";

const CAPACITY_USERS = 50_000;

const MODULE_ICONS: Record<string, string> = {
  "/admin/organizasyon": "ORG",
  "/admin/kullanicilar": "USR",
  "/admin/abonelikler": "SUB",
  "/admin/ilanlar": "FRG",
  "/admin/ihaleler": "AUC",
  "/admin/guven": "TRU",
  "/admin/odemeler": "PAY",
  "/admin/entegrasyon": "API",
  "/admin/sistem": "SYS",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export function AdminDashboardClient() {
  const { accessToken, session } = useWebSession();
  const [overview, setOverview] = useState<PlatformAdminOverview | null>(null);
  const [auditPreview, setAuditPreview] = useState<
    Awaited<ReturnType<typeof PlatformAdminApiClient.fetchAuditLogs>>
  >([]);
  const [loading, setLoading] = useState(true);

  const modules = flattenPlatformAdminNav().filter((item) => item.href !== "/admin");

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    void Promise.all([
      PlatformAdminApiClient.fetchOverview(accessToken),
      PlatformAdminApiClient.fetchAuditLogs(accessToken),
    ])
      .then(([ov, logs]) => {
        setOverview(ov);
        setAuditPreview(logs.slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  const donutSegments = useMemo(() => {
    if (!overview) {
      return [];
    }
    const b = overview.participantBreakdown ?? {
      loadShipper: 0,
      loadCarrier: 0,
      loadSeeker: 0,
      other: overview.companies,
    };
    return [
      { label: "Yük veren", value: b.loadShipper, color: "#0d9488" },
      { label: "Yük taşıyan", value: b.loadCarrier, color: "#2563eb" },
      { label: "Yük arayan", value: b.loadSeeker, color: "#d97706" },
      { label: "Diğer", value: b.other, color: "#64748b" },
    ].filter((s) => s.value > 0);
  }, [overview]);

  const todayLabel = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const userUtilization = overview
    ? Math.min(100, (overview.users / CAPACITY_USERS) * 100)
    : 0;

  return (
    <div className="platform-admin-command">
      <header className="platform-admin-command-hero">
        <div>
          <p className="platform-admin-command-eyebrow">Nakliye Borsası · TR · UA · EU</p>
          <h1 className="platform-admin-command-title">Kontrol merkezi</h1>
          <p className="platform-admin-command-sub">
            {todayLabel} — platform operasyon özeti
          </p>
        </div>
        <div className="platform-admin-command-hero-meta">
          <span className="admin-status-pill admin-status-pill--ok">Sistem operasyonel</span>
          <span className="admin-status-pill">API :3010</span>
          <span className="admin-status-pill">Web :3011</span>
        </div>
      </header>

      {loading ? (
        <p className="platform-admin-loading-inline">Kontrol merkezi yükleniyor…</p>
      ) : null}

      <section className="admin-kpi-row" aria-label="Temel göstergeler">
        <article className="admin-kpi-card admin-kpi-card--primary">
          <div className="admin-kpi-card-head">
            <span className="admin-kpi-label">Kayıtlı kullanıcı</span>
            <span className="admin-kpi-badge">Kapasite {formatNumber(CAPACITY_USERS)}+</span>
          </div>
          <p className="admin-kpi-value">{formatNumber(overview?.users ?? 0)}</p>
          <div className="admin-kpi-footer">
            <AdminSparkline values={buildTrendSeries(overview?.users ?? 3)} />
            <span className="admin-kpi-hint">{userUtilization.toFixed(2)}% doluluk</span>
          </div>
          <div className="admin-capacity-track" aria-hidden>
            <div
              className="admin-capacity-fill"
              style={{ width: `${userUtilization}%` }}
            />
          </div>
        </article>

        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Firma</span>
          <p className="admin-kpi-value">{formatNumber(overview?.companies ?? 0)}</p>
          <AdminSparkline
            values={buildTrendSeries(overview?.companies ?? 2)}
            stroke="#2563eb"
          />
        </article>

        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Yük ilanı</span>
          <p className="admin-kpi-value">{formatNumber(overview?.listings ?? 0)}</p>
          <AdminSparkline
            values={buildTrendSeries(overview?.listings ?? 2)}
            stroke="#7c3aed"
          />
        </article>

        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Açık ihale</span>
          <p className="admin-kpi-value">
            {overview ? `${overview.openAuctions}/${overview.auctions}` : "—"}
          </p>
          <AdminSparkline
            values={buildTrendSeries(overview?.openAuctions ?? 1)}
            stroke="#d97706"
          />
        </article>

        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Mesaj kanalı</span>
          <p className="admin-kpi-value">{formatNumber(overview?.messageThreads ?? 0)}</p>
        </article>

        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Güven yorumu</span>
          <p className="admin-kpi-value">{formatNumber(overview?.trustReviews ?? 0)}</p>
        </article>
      </section>

      <div className="admin-command-grid">
        <section className="admin-panel-card">
          <header className="admin-panel-card-head">
            <h2>Pazar rol dağılımı</h2>
            <p>Firmaların yük veren / taşıyan / arayan profili</p>
          </header>
          {overview && donutSegments.length > 0 ? (
            <AdminDonutChart
              segments={donutSegments}
              centerLabel="Firma"
              centerValue={String(overview.companies)}
            />
          ) : (
            <p className="platform-admin-empty">Henüz sınıflandırılmış firma yok.</p>
          )}
        </section>

        <section className="admin-panel-card">
          <header className="admin-panel-card-head">
            <h2>Operasyon yoğunluğu</h2>
            <p>Göreli aktivite endeksi (canlı veri)</p>
          </header>
          {overview ? (
            <AdminBarChart
              items={[
                {
                  label: "İlanlar",
                  value: overview.operationsIndex.listings,
                  displayValue: String(overview.listings),
                  color: "#0d9488",
                },
                {
                  label: "İhaleler",
                  value: overview.operationsIndex.auctions,
                  displayValue: String(overview.auctions),
                  color: "#2563eb",
                },
                {
                  label: "Mesajlar",
                  value: overview.operationsIndex.messageThreads,
                  displayValue: String(overview.messageThreads),
                  color: "#7c3aed",
                },
                {
                  label: "Güven",
                  value: overview.operationsIndex.trustReviews,
                  displayValue: String(overview.trustReviews),
                  color: "#d97706",
                },
                {
                  label: "API audit",
                  value: overview.operationsIndex.auditLogs,
                  displayValue: String(overview.auditLogs),
                  color: "#64748b",
                },
              ]}
            />
          ) : null}
        </section>

        <section className="admin-panel-card admin-panel-card--activity">
          <header className="admin-panel-card-head">
            <h2>Son sistem hareketleri</h2>
            <Link href="/admin/entegrasyon">Tüm loglar →</Link>
          </header>
          <ul className="admin-activity-feed">
            {auditPreview.map((log) => (
              <li key={log.id}>
                <span className={`admin-activity-method admin-activity-method--${log.httpMethod.toLowerCase()}`}>
                  {log.httpMethod}
                </span>
                <span className="admin-activity-path">{log.requestPath}</span>
                <span className="admin-activity-status">{log.responseStatusCode}</span>
              </li>
            ))}
            {auditPreview.length === 0 ? (
              <li className="platform-admin-empty">Audit kaydı yok.</li>
            ) : null}
          </ul>
        </section>

        <section className="admin-panel-card admin-panel-card--modules">
          <header className="admin-panel-card-head">
            <h2>Modül kısayolları</h2>
            <p>{session?.emailAddress ?? "operatör"}</p>
          </header>
          <div className="admin-module-compact-grid">
            {modules.map((module) => (
              <Link key={module.href} href={module.href} className="admin-module-compact">
                <span className="admin-module-compact-icon">
                  {MODULE_ICONS[module.href] ?? "MOD"}
                </span>
                <span className="admin-module-compact-text">
                  <strong>{module.label}</strong>
                  <span>{module.description}</span>
                </span>
                <span className="admin-module-compact-arrow" aria-hidden>→</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
