"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlatformAdminApiClient } from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";
import { AdminBarChart, AdminDonutChart } from "./AdminDashboardCharts";

type LogRow = Awaited<
  ReturnType<typeof PlatformAdminApiClient.fetchAuditLogs>
>[number];

type HttpBucket = "2xx" | "3xx" | "4xx" | "5xx" | "other";

type MethodFilter = "all" | string;

type BucketFilter = "all" | HttpBucket;

function httpBucket(status: number): HttpBucket {
  if (status >= 200 && status < 300) {
    return "2xx";
  }
  if (status >= 300 && status < 400) {
    return "3xx";
  }
  if (status >= 400 && status < 500) {
    return "4xx";
  }
  if (status >= 500) {
    return "5xx";
  }
  return "other";
}

function formatBucket(label: HttpBucket): string {
  switch (label) {
    case "2xx":
      return "Başarılı (2xx)";
    case "3xx":
      return "Yönlendirme (3xx)";
    case "4xx":
      return "İstemci (4xx)";
    case "5xx":
      return "Sunucu (5xx)";
    default:
      return "Diğer";
  }
}

function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const BUCKET_COLORS: Record<HttpBucket, string> = {
  "2xx": "#0d9488",
  "3xx": "#2563eb",
  "4xx": "#d97706",
  "5xx": "#dc2626",
  other: "#64748b",
};

export function AdminIntegrationsPageClient() {
  const { accessToken } = useWebSession();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>("all");
  const [selectedId, setSelectedId] = useState("");

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const logs = await PlatformAdminApiClient.fetchAuditLogs(accessToken);
      setRows(logs);
      setSelectedId((current) => current || logs[0]?.id || "");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(() => {
    const byMethod = new Map<string, number>();
    const byBucket = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0, other: 0 };
    const paths = new Set<string>();
    let errors = 0;

    for (const row of rows) {
      paths.add(row.requestPath);
      byMethod.set(row.httpMethod, (byMethod.get(row.httpMethod) ?? 0) + 1);
      const bucket = httpBucket(row.responseStatusCode);
      byBucket[bucket]++;
      if (row.responseStatusCode >= 400) {
        errors++;
      }
    }

    return {
      total: rows.length,
      uniquePaths: paths.size,
      errors,
      byMethod,
      byBucket,
    };
  }, [rows]);

  const donutSegments = useMemo(
    () =>
      (["2xx", "3xx", "4xx", "5xx", "other"] as HttpBucket[])
        .map((bucket) => ({
          label: formatBucket(bucket),
          value: summary.byBucket[bucket],
          color: BUCKET_COLORS[bucket],
        }))
        .filter((s) => s.value > 0),
    [summary.byBucket],
  );

  const methodOptions = useMemo(
    () => [...summary.byMethod.keys()].sort(),
    [summary.byMethod],
  );

  const bucketFilters: { id: BucketFilter; label: string }[] = [
    { id: "all", label: "Tüm HTTP" },
    { id: "2xx", label: "2xx" },
    { id: "4xx", label: "4xx" },
    { id: "5xx", label: "5xx" },
  ];

  const q = filter.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (methodFilter !== "all" && row.httpMethod !== methodFilter) {
      return false;
    }
    if (bucketFilter !== "all" && httpBucket(row.responseStatusCode) !== bucketFilter) {
      return false;
    }
    if (!q) {
      return true;
    }
    return (
      row.requestPath.toLowerCase().includes(q) ||
      row.actionCode.toLowerCase().includes(q) ||
      row.httpMethod.toLowerCase().includes(q) ||
      String(row.responseStatusCode).includes(q)
    );
  });

  const selected = rows.find((r) => r.id === selectedId) ?? filtered[0];

  const methodBarItems = useMemo(() => {
    const colors = ["#1e3a5f", "#2563eb", "#0d9488", "#d97706", "#64748b"];
    return [...summary.byMethod.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([method, value], index) => ({
        label: method,
        value,
        displayValue: String(value),
        color: colors[index % colors.length],
      }));
  }, [summary.byMethod]);

  return (
    <div className="platform-admin-command admin-integrations-premium">
      <header className="platform-admin-command-hero">
        <div>
          <p className="platform-admin-command-eyebrow">API ve harici trafik</p>
          <h1 className="platform-admin-command-title">Entegrasyonlar</h1>
          <p className="platform-admin-command-sub">
            HTTP audit log — son {rows.length} kayıt (API kullanımı)
          </p>
        </div>
        <div className="platform-admin-command-hero-meta">
          <span className="admin-status-pill admin-status-pill--ok">
            {summary.uniquePaths} benzersiz yol
          </span>
          <button type="button" className="admin-btn-ghost-light" onClick={() => void refresh()}>
            Yenile
          </button>
        </div>
      </header>

      <section className="admin-kpi-row admin-integrations-kpi-row" aria-label="Entegrasyon özet">
        <article className="admin-kpi-card admin-kpi-card--primary">
          <span className="admin-kpi-label">Audit kaydı</span>
          <p className="admin-kpi-value">{summary.total}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">2xx başarı</span>
          <p className="admin-kpi-value">{summary.byBucket["2xx"]}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Hata (4xx+)</span>
          <p className="admin-kpi-value">{summary.errors}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">5xx</span>
          <p className="admin-kpi-value">{summary.byBucket["5xx"]}</p>
        </article>
        <article className="admin-panel-card admin-org-donut-card">
          {donutSegments.length > 0 ? (
            <AdminDonutChart
              segments={donutSegments}
              centerLabel="HTTP"
              centerValue={String(summary.total)}
            />
          ) : (
            <p className="platform-admin-empty">Veri yok</p>
          )}
        </article>
      </section>

      <section className="admin-panel-card admin-integrations-method-chart">
        <header className="admin-panel-card-head">
          <div>
            <h2>HTTP metod dağılımı</h2>
            <p>Audit log içindeki istek türleri</p>
          </div>
        </header>
        {methodBarItems.length > 0 ? (
          <AdminBarChart items={methodBarItems} />
        ) : (
          <p className="platform-admin-empty">Henüz istek kaydı yok.</p>
        )}
      </section>

      <div className="admin-org-layout admin-org-layout--premium admin-integrations-layout">
        <aside className="admin-org-sidebar admin-panel-card">
          <header className="admin-org-sidebar-head">
            <h2>İstek dizini</h2>
            <p>{filtered.length} / {rows.length}</p>
          </header>
          <label className="admin-field">
            <span>Ara</span>
            <input
              className="admin-input"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Yol, action kodu"
            />
          </label>
          <div className="admin-org-type-filters" role="tablist" aria-label="HTTP durum">
            {bucketFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  bucketFilter === item.id
                    ? "admin-org-type-chip active"
                    : "admin-org-type-chip"
                }
                onClick={() => setBucketFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="admin-org-type-filters admin-integrations-method-filters">
            <button
              type="button"
              className={
                methodFilter === "all"
                  ? "admin-org-type-chip active"
                  : "admin-org-type-chip"
              }
              onClick={() => setMethodFilter("all")}
            >
              Tüm metodlar
            </button>
            {methodOptions.map((method) => (
              <button
                key={method}
                type="button"
                className={
                  methodFilter === method
                    ? "admin-org-type-chip active"
                    : "admin-org-type-chip"
                }
                onClick={() => setMethodFilter(method)}
              >
                {method}
              </button>
            ))}
          </div>
          {loading ? (
            <p className="platform-admin-loading-inline">Liste yükleniyor…</p>
          ) : (
            <ul className="admin-org-company-list admin-org-company-list--premium">
              {filtered.map((row) => {
                const bucket = httpBucket(row.responseStatusCode);
                const isError = row.responseStatusCode >= 400;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={
                        selectedId === row.id
                          ? "admin-org-company admin-org-company--premium active"
                          : "admin-org-company admin-org-company--premium"
                      }
                      onClick={() => setSelectedId(row.id)}
                    >
                      <span className="admin-org-company-top">
                        <strong>{row.httpMethod}</strong>
                        <span
                          className={
                            isError
                              ? "admin-org-badge admin-org-badge--danger"
                              : "admin-org-badge admin-org-badge--ok"
                          }
                        >
                          {row.responseStatusCode}
                        </span>
                      </span>
                      <span className="admin-integrations-list-path">{row.requestPath}</span>
                      <span className="admin-org-company-meta">
                        <span>{row.actionCode}</span>
                        <span>{formatBucket(bucket)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="admin-org-main">
          {!selected ? (
            <p className="platform-admin-empty">Kayıt seçin.</p>
          ) : (
            <>
              <header className="admin-org-detail-hero admin-panel-card">
                <div>
                  <h2 className="admin-integrations-detail-path">{selected.requestPath}</h2>
                  <p className="admin-integrations-detail-meta">
                    {selected.httpMethod} · {selected.responseStatusCode} · {selected.actionCode}
                  </p>
                  <div className="admin-org-detail-pills">
                    <span
                      className={
                        selected.responseStatusCode >= 400
                          ? "admin-org-badge admin-org-badge--danger"
                          : "admin-org-badge admin-org-badge--ok"
                      }
                    >
                      HTTP {selected.responseStatusCode}
                    </span>
                    <span className="admin-org-badge">
                      {formatBucket(httpBucket(selected.responseStatusCode))}
                    </span>
                    <span className="admin-org-badge">{formatLogTime(selected.createdAt)}</span>
                  </div>
                </div>
                <div className="admin-org-detail-stats admin-users-detail-actions">
                  <Link href="/admin" className="admin-btn-primary">
                    Kontrol merkezi
                  </Link>
                  <Link href="/integrations" className="admin-btn-secondary" target="_blank" rel="noreferrer">
                    Üye entegrasyonlar
                  </Link>
                </div>
              </header>

              <div className="admin-users-detail-grid admin-integrations-detail-grid">
                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>İstek</h2>
                      <p>Audit alanları</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>Metod</dt>
                      <dd>{selected.httpMethod}</dd>
                    </div>
                    <div>
                      <dt>Yol</dt>
                      <dd><code className="admin-integrations-code">{selected.requestPath}</code></dd>
                    </div>
                    <div>
                      <dt>Action kodu</dt>
                      <dd><code>{selected.actionCode}</code></dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Yanıt</h2>
                      <p>HTTP sonucu</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>Durum kodu</dt>
                      <dd>{selected.responseStatusCode}</dd>
                    </div>
                    <div>
                      <dt>Sınıf</dt>
                      <dd>{formatBucket(httpBucket(selected.responseStatusCode))}</dd>
                    </div>
                    <div>
                      <dt>Zaman</dt>
                      <dd>{formatLogTime(selected.createdAt)}</dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card admin-users-detail-wide">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Kayıt kimliği</h2>
                      <p>Veritabanı audit satırı</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>Log ID</dt>
                      <dd><code>{selected.id}</code></dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card admin-users-detail-wide">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Operatör notları</h2>
                      <p>Webhook ve harici feed izleme</p>
                    </div>
                  </header>
                  <ul className="admin-checklist admin-users-checklist">
                    <li>Harici feed modülü: SubscriptionModuleCode.ExternalFeeds</li>
                    <li>API erişimi: kurumsal paketlerde ApiAccess</li>
                    <li>Tam istek gövdesi loglama kapalı (gizlilik)</li>
                  </ul>
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
