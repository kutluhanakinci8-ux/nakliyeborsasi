"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlatformAdminApiClient,
  type PlatformAdminOverview,
} from "../../lib/PlatformAdminApiClient";
import { PublicApiConfiguration } from "../../lib/PublicApiConfiguration";
import { flattenPlatformAdminNav } from "../../lib/platformAdminNavigation";
import { useWebSession } from "../../context/WebSessionProvider";
import { AdminBarChart, AdminDonutChart } from "./AdminDashboardCharts";

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
  "/admin/bildirimler": "MAIL",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export function AdminSystemPageClient() {
  const { accessToken, session } = useWebSession();
  const [overview, setOverview] = useState<PlatformAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const modules = flattenPlatformAdminNav().filter((item) => item.href !== "/admin");

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const ov = await PlatformAdminApiClient.fetchOverview(accessToken);
      setOverview(ov);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const apiBase =
    typeof window !== "undefined"
      ? PublicApiConfiguration.resolveBaseUrl()
      : process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3010/api/v1";

  const donutSegments = useMemo(() => {
    if (!overview) {
      return [];
    }
    const b = overview.participantBreakdown;
    return [
      { label: "Yük veren", value: b.loadShipper, color: "#0d9488" },
      { label: "Yük taşıyan", value: b.loadCarrier, color: "#2563eb" },
      { label: "Yük arayan", value: b.loadSeeker, color: "#d97706" },
      { label: "Diğer", value: b.other, color: "#64748b" },
    ].filter((s) => s.value > 0);
  }, [overview]);

  const operationsItems = useMemo(() => {
    if (!overview) {
      return [];
    }
    const op = overview.operationsIndex;
    return [
      { label: "İlan", value: op.listings, displayValue: String(op.listings), color: "#2563eb" },
      { label: "İhale", value: op.auctions, displayValue: String(op.auctions), color: "#0d9488" },
      { label: "Mesaj", value: op.messageThreads, displayValue: String(op.messageThreads), color: "#d97706" },
      { label: "Güven", value: op.trustReviews, displayValue: String(op.trustReviews), color: "#7c3aed" },
      { label: "Audit", value: op.auditLogs, displayValue: String(op.auditLogs), color: "#64748b" },
    ];
  }, [overview]);

  const userUtilization = overview
    ? Math.min(100, (overview.users / CAPACITY_USERS) * 100)
    : 0;

  return (
    <div className="platform-admin-command admin-system-premium">
      <header className="platform-admin-command-hero">
        <div>
          <p className="platform-admin-command-eyebrow">Platform yapılandırması</p>
          <h1 className="platform-admin-command-title">Sistem</h1>
          <p className="platform-admin-command-sub">
            Koridor TR · UA · EU — ortam, kapasite ve modül erişimi
          </p>
        </div>
        <div className="platform-admin-command-hero-meta">
          <span className="admin-status-pill admin-status-pill--ok">Operasyonel</span>
          <span className="admin-status-pill">API :3010</span>
          <span className="admin-status-pill">Web :3011</span>
          <button type="button" className="admin-btn-ghost-light" onClick={() => void refresh()}>
            Yenile
          </button>
        </div>
      </header>

      {loading ? (
        <p className="platform-admin-loading-inline">Sistem özeti yükleniyor…</p>
      ) : null}

      <section className="admin-kpi-row admin-system-kpi-row" aria-label="Sistem özet">
        <article className="admin-kpi-card admin-kpi-card--primary">
          <span className="admin-kpi-label">Firmalar</span>
          <p className="admin-kpi-value">{formatNumber(overview?.companies ?? 0)}</p>
          <span className="admin-kpi-hint">
            {formatNumber(overview?.users ?? 0)} kullanıcı üyeliği
          </span>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Açık ihale</span>
          <p className="admin-kpi-value">{overview?.openAuctions ?? 0}</p>
          <span className="admin-kpi-hint">{overview?.auctions ?? 0} toplam</span>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Abonelik</span>
          <p className="admin-kpi-value">{overview?.subscriptions ?? 0}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Kapasite kullanımı</span>
          <p className="admin-kpi-value">{userUtilization.toFixed(1)}%</p>
          <span className="admin-kpi-hint">{formatNumber(CAPACITY_USERS)}+ hedef</span>
        </article>
        <article className="admin-panel-card admin-org-donut-card">
          {donutSegments.length > 0 ? (
            <AdminDonutChart
              segments={donutSegments}
              centerLabel="Firma"
              centerValue={String(overview?.companies ?? 0)}
            />
          ) : (
            <p className="platform-admin-empty">Veri yok</p>
          )}
        </article>
      </section>

      <section className="admin-panel-card admin-system-ops-chart">
        <header className="admin-panel-card-head">
          <div>
            <h2>Operasyon indeksi</h2>
            <p>Normalize edilmiş hacim göstergeleri (kontrol merkezi ile aynı)</p>
          </div>
        </header>
        {operationsItems.length > 0 ? (
          <AdminBarChart items={operationsItems} />
        ) : (
          <p className="platform-admin-empty">Özet yüklenemedi.</p>
        )}
      </section>

      <div className="admin-system-grid">
        <section className="admin-panel-card">
          <header className="admin-panel-card-head">
            <div>
              <h2>Ortam</h2>
              <p>Çalışma zamanı uç noktaları</p>
            </div>
          </header>
          <dl className="admin-users-dl">
            <div>
              <dt>API base URL</dt>
              <dd><code>{apiBase}</code></dd>
            </div>
            <div>
              <dt>Web port</dt>
              <dd>3011</dd>
            </div>
            <div>
              <dt>Admin oturumu</dt>
              <dd>{session?.emailAddress ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="admin-panel-card">
          <header className="admin-panel-card-head">
            <div>
              <h2>Veritabanı hacmi</h2>
              <p>Overview API sayımları</p>
            </div>
          </header>
          <dl className="admin-users-dl">
            <div>
              <dt>İlan</dt>
              <dd>{overview?.listings ?? "—"}</dd>
            </div>
            <div>
              <dt>Mesaj thread</dt>
              <dd>{overview?.messageThreads ?? "—"}</dd>
            </div>
            <div>
              <dt>Audit log</dt>
              <dd>{overview?.auditLogs ?? "—"}</dd>
            </div>
            <div>
              <dt>Güven değerlendirme</dt>
              <dd>{overview?.trustReviews ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="admin-panel-card admin-users-detail-wide admin-system-modules">
          <header className="admin-panel-card-head">
            <div>
              <h2>Modül geçişleri</h2>
              <p>Tüm yönetim konsolu bölümleri</p>
            </div>
          </header>
          <ul className="admin-system-module-links">
            {modules.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="admin-system-module-link">
                  <span className="admin-system-module-icon">
                    {MODULE_ICONS[item.href] ?? "MOD"}
                  </span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-panel-card admin-users-detail-wide">
          <header className="admin-panel-card-head">
            <div>
              <h2>Yol haritası</h2>
              <p>Bakım modu ve duyurular</p>
            </div>
          </header>
          <ul className="admin-checklist admin-users-checklist">
            <li>Test şifresi: TestPass123! (@test.nakliyeborsasi.local)</li>
            <li>Admin: admin@nakliyeborsasi.local — docs/TEST_USERS.md</li>
            <li>Bakım modu, global duyuru banner: sonraki sürüm</li>
            <li>VPS deploy: scripts/deploy-vps-ssh.sh</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
