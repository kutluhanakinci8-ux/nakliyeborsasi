"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlatformAdminApiClient,
  formatParticipantType,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";
import { AdminBarChart, AdminDonutChart } from "./AdminDashboardCharts";

type SubRow = Awaited<
  ReturnType<typeof PlatformAdminApiClient.fetchSubscriptions>
>["subscriptions"][number];

type PlanRow = Awaited<
  ReturnType<typeof PlatformAdminApiClient.fetchSubscriptions>
>["plans"][number];

type CompanyRow = Awaited<
  ReturnType<typeof PlatformAdminApiClient.fetchCompanies>
>[number];

type EnrichedSub = SubRow & {
  participantTypeCode: string | null;
};

type StatusFilter = "all" | "active" | "inactive";

type TypeFilter = "all" | "LOAD_SHIPPER" | "LOAD_CARRIER" | "LOAD_SEEKER" | "other";

type PlanFilter = "all" | string;

function participantKey(code: string | null | undefined): TypeFilter {
  if (code === "LOAD_SHIPPER" || code === "LOAD_CARRIER" || code === "LOAD_SEEKER") {
    return code;
  }
  return "other";
}

function formatPlanLabel(planCode: string): string {
  switch (planCode) {
    case "carrier_starter_tr_ua":
      return "Taşıyıcı · Başlangıç";
    case "carrier_professional_tr_ua":
      return "Taşıyıcı · Profesyonel";
    case "forwarder_enterprise_tr_ua":
      return "Forwarder · Kurumsal";
    default:
      return planCode;
  }
}

function formatTierLabel(tierCode: string): string {
  switch (tierCode) {
    case "STARTER":
      return "Başlangıç";
    case "PROFESSIONAL":
      return "Profesyonel";
    case "ENTERPRISE":
      return "Kurumsal";
    default:
      return tierCode;
  }
}

function formatModuleCode(code: string): string {
  switch (code) {
    case "MARKETPLACE_SEARCH":
      return "Pazar arama";
    case "CONTACTS":
      return "İletişim açma";
    case "EXTERNAL_FEEDS":
      return "Harici akışlar";
    case "LANE_ANALYTICS":
      return "Hat analitiği";
    case "AUCTION":
      return "İhale";
    case "MESSAGING":
      return "Mesajlaşma";
    case "TRUST_PROFILE":
      return "Güven profili";
    case "FLEET":
      return "Filo";
    case "API_ACCESS":
      return "API erişimi";
    default:
      return code;
  }
}

const PLAN_COLORS: Record<string, string> = {
  carrier_starter_tr_ua: "#64748b",
  carrier_professional_tr_ua: "#2563eb",
  forwarder_enterprise_tr_ua: "#0d9488",
};

export function AdminSubscriptionsPageClient() {
  const { accessToken } = useWebSession();
  const [rows, setRows] = useState<EnrichedSub[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [selectedId, setSelectedId] = useState("");

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const [payload, companies] = await Promise.all([
        PlatformAdminApiClient.fetchSubscriptions(accessToken),
        PlatformAdminApiClient.fetchCompanies(accessToken),
      ]);
      const companyMap = new Map(companies.map((c: CompanyRow) => [c.id, c]));
      const enriched: EnrichedSub[] = payload.subscriptions.map((sub) => ({
        ...sub,
        participantTypeCode:
          companyMap.get(sub.companyId)?.participantTypeCode ?? null,
      }));
      setRows(enriched);
      setPlans(payload.plans);
      setSelectedId((current) => current || enriched[0]?.id || "");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const planByCode = useMemo(
    () => new Map(plans.map((p) => [p.planCode, p])),
    [plans],
  );

  const summary = useMemo(() => {
    let active = 0;
    let inactive = 0;
    const byPlan = new Map<string, number>();
    const byTier = { starter: 0, professional: 0, enterprise: 0, other: 0 };

    for (const row of rows) {
      if (row.isActive) {
        active++;
      } else {
        inactive++;
      }
      byPlan.set(row.planCode, (byPlan.get(row.planCode) ?? 0) + 1);
      const tier = planByCode.get(row.planCode)?.tierCode ?? "";
      switch (tier) {
        case "STARTER":
          byTier.starter++;
          break;
        case "PROFESSIONAL":
          byTier.professional++;
          break;
        case "ENTERPRISE":
          byTier.enterprise++;
          break;
        default:
          byTier.other++;
      }
    }

    return {
      total: rows.length,
      active,
      inactive,
      catalogPlans: plans.length,
      byPlan,
      byTier,
    };
  }, [rows, plans, planByCode]);

  const donutSegments = useMemo(() => {
    const segments: { label: string; value: number; color: string }[] = [];
    for (const [planCode, count] of summary.byPlan) {
      if (count <= 0) {
        continue;
      }
      segments.push({
        label: formatPlanLabel(planCode),
        value: count,
        color: PLAN_COLORS[planCode] ?? "#94a3b8",
      });
    }
    return segments.sort((a, b) => b.value - a.value);
  }, [summary.byPlan]);

  const planFilterOptions = useMemo(() => {
    const codes = [...new Set(rows.map((r) => r.planCode))].sort();
    return codes;
  }, [rows]);

  const q = filter.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (statusFilter === "active" && !row.isActive) {
      return false;
    }
    if (statusFilter === "inactive" && row.isActive) {
      return false;
    }
    if (planFilter !== "all" && row.planCode !== planFilter) {
      return false;
    }
    if (typeFilter !== "all" && participantKey(row.participantTypeCode) !== typeFilter) {
      return false;
    }
    if (!q) {
      return true;
    }
    return (
      row.companyLegalName.toLowerCase().includes(q) ||
      row.planCode.toLowerCase().includes(q) ||
      formatPlanLabel(row.planCode).toLowerCase().includes(q) ||
      row.companyId.toLowerCase().includes(q)
    );
  });

  const selected = rows.find((r) => r.id === selectedId) ?? filtered[0];
  const selectedPlan = selected ? planByCode.get(selected.planCode) : undefined;

  const statusFilters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "Tümü" },
    { id: "active", label: "Aktif" },
    { id: "inactive", label: "Pasif" },
  ];

  const typeFilters: { id: TypeFilter; label: string }[] = [
    { id: "all", label: "Tüm pazar rolleri" },
    { id: "LOAD_SHIPPER", label: "Yük veren" },
    { id: "LOAD_CARRIER", label: "Taşıyan" },
    { id: "LOAD_SEEKER", label: "Arayan" },
    { id: "other", label: "Diğer" },
  ];

  return (
    <div className="platform-admin-command admin-subscriptions-premium">
      <header className="platform-admin-command-hero">
        <div>
          <p className="platform-admin-command-eyebrow">Gelir ve erişim</p>
          <h1 className="platform-admin-command-title">Abonelikler</h1>
          <p className="platform-admin-command-sub">
            Firma planları ve katalog — {summary.catalogPlans} tanımlı paket
          </p>
        </div>
        <div className="platform-admin-command-hero-meta">
          <span className="admin-status-pill admin-status-pill--ok">
            {summary.active} aktif abonelik
          </span>
          <button type="button" className="admin-btn-ghost-light" onClick={() => void refresh()}>
            Yenile
          </button>
        </div>
      </header>

      <section className="admin-kpi-row admin-subscriptions-kpi-row" aria-label="Abonelik özet">
        <article className="admin-kpi-card admin-kpi-card--primary">
          <span className="admin-kpi-label">Aktif</span>
          <p className="admin-kpi-value">{summary.active}</p>
          <span className="admin-kpi-hint">{summary.total} toplam kayıt</span>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Pasif</span>
          <p className="admin-kpi-value">{summary.inactive}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Kurumsal katman</span>
          <p className="admin-kpi-value">{summary.byTier.enterprise}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Profesyonel</span>
          <p className="admin-kpi-value">{summary.byTier.professional}</p>
        </article>
        <article className="admin-panel-card admin-org-donut-card">
          {donutSegments.length > 0 ? (
            <AdminDonutChart
              segments={donutSegments}
              centerLabel="Plan"
              centerValue={String(summary.active)}
            />
          ) : (
            <p className="platform-admin-empty">Veri yok</p>
          )}
        </article>
      </section>

      <section className="admin-panel-card admin-subscriptions-tier-chart">
        <header className="admin-panel-card-head">
          <div>
            <h2>Katman dağılımı</h2>
            <p>Starter · Profesyonel · Kurumsal (aktif + pasif kayıtlar)</p>
          </div>
        </header>
        <AdminBarChart
          items={[
            {
              label: "Başlangıç",
              value: summary.byTier.starter,
              displayValue: String(summary.byTier.starter),
              color: "#64748b",
            },
            {
              label: "Profesyonel",
              value: summary.byTier.professional,
              displayValue: String(summary.byTier.professional),
              color: "#2563eb",
            },
            {
              label: "Kurumsal",
              value: summary.byTier.enterprise,
              displayValue: String(summary.byTier.enterprise),
              color: "#0d9488",
            },
          ]}
        />
      </section>

      <div className="admin-org-layout admin-org-layout--premium admin-subscriptions-layout">
        <aside className="admin-org-sidebar admin-panel-card">
          <header className="admin-org-sidebar-head">
            <h2>Abonelik dizini</h2>
            <p>{filtered.length} / {rows.length}</p>
          </header>
          <label className="admin-field">
            <span>Ara</span>
            <input
              className="admin-input"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Firma, plan kodu"
            />
          </label>
          <div className="admin-org-type-filters" role="tablist" aria-label="Durum">
            {statusFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  statusFilter === item.id
                    ? "admin-org-type-chip active"
                    : "admin-org-type-chip"
                }
                onClick={() => setStatusFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="admin-org-type-filters admin-subscriptions-plan-filters">
            <button
              type="button"
              className={
                planFilter === "all"
                  ? "admin-org-type-chip active"
                  : "admin-org-type-chip"
              }
              onClick={() => setPlanFilter("all")}
            >
              Tüm planlar
            </button>
            {planFilterOptions.map((code) => (
              <button
                key={code}
                type="button"
                className={
                  planFilter === code
                    ? "admin-org-type-chip active"
                    : "admin-org-type-chip"
                }
                onClick={() => setPlanFilter(code)}
              >
                {formatPlanLabel(code)}
              </button>
            ))}
          </div>
          <div className="admin-org-type-filters admin-subscriptions-type-filters">
            {typeFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  typeFilter === item.id
                    ? "admin-org-type-chip active"
                    : "admin-org-type-chip"
                }
                onClick={() => setTypeFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {loading ? (
            <p className="platform-admin-loading-inline">Liste yükleniyor…</p>
          ) : (
            <ul className="admin-org-company-list admin-org-company-list--premium">
              {filtered.map((row) => (
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
                      <strong>{row.companyLegalName}</strong>
                      <span
                        className={
                          row.isActive
                            ? "admin-org-badge admin-org-badge--ok"
                            : "admin-org-badge"
                        }
                      >
                        {row.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </span>
                    <span className="admin-subscriptions-list-plan">
                      {formatPlanLabel(row.planCode)}
                    </span>
                    <span className="admin-org-company-meta">
                      <span className="admin-org-badge">
                        {formatParticipantType(row.participantTypeCode)}
                      </span>
                      <span>
                        {new Date(row.createdAt).toLocaleDateString("tr-TR")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="admin-org-main">
          {!selected ? (
            <p className="platform-admin-empty">Abonelik seçin.</p>
          ) : (
            <>
              <header className="admin-org-detail-hero admin-panel-card">
                <div>
                  <h2>{selected.companyLegalName}</h2>
                  <p className="admin-subscriptions-detail-plan">
                    {formatPlanLabel(selected.planCode)}
                  </p>
                  <div className="admin-org-detail-pills">
                    <span
                      className={
                        selected.isActive
                          ? "admin-org-badge admin-org-badge--ok"
                          : "admin-org-badge"
                      }
                    >
                      {selected.isActive ? "Aktif abonelik" : "Pasif kayıt"}
                    </span>
                    {selectedPlan ? (
                      <span className="admin-org-badge">
                        {formatTierLabel(selectedPlan.tierCode)}
                      </span>
                    ) : null}
                    <span className="admin-org-badge">
                      {formatParticipantType(selected.participantTypeCode)}
                    </span>
                  </div>
                </div>
                <div className="admin-org-detail-stats admin-users-detail-actions">
                  <Link
                    href={`/admin/organizasyon?firma=${selected.companyId}`}
                    className="admin-btn-primary"
                  >
                    Firmayı yönet
                  </Link>
                  <Link href="/admin/odemeler" className="admin-btn-secondary">
                    Ödemeler modülü
                  </Link>
                </div>
              </header>

              <div className="admin-users-detail-grid admin-subscriptions-detail-grid">
                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Kayıt</h2>
                      <p>Veritabanı abonelik satırı</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>Abonelik ID</dt>
                      <dd><code>{selected.id}</code></dd>
                    </div>
                    <div>
                      <dt>Firma ID</dt>
                      <dd><code>{selected.companyId}</code></dd>
                    </div>
                    <div>
                      <dt>Plan kodu</dt>
                      <dd><code>{selected.planCode}</code></dd>
                    </div>
                    <div>
                      <dt>Başlangıç</dt>
                      <dd>
                        {new Date(selected.createdAt).toLocaleString("tr-TR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Paket özeti</h2>
                      <p>Katalog tanımı</p>
                    </div>
                  </header>
                  {selectedPlan ? (
                    <dl className="admin-users-dl">
                      <div>
                        <dt>Katman</dt>
                        <dd>{formatTierLabel(selectedPlan.tierCode)}</dd>
                      </div>
                      <div>
                        <dt>Eşzamanlı arama</dt>
                        <dd>{selectedPlan.maxConcurrentSearchTabs ?? "—"} sekme</dd>
                      </div>
                      <div>
                        <dt>Hat geçmişi</dt>
                        <dd>
                          {(selectedPlan.laneAnalyticsHistoryDays ?? 0) > 0
                            ? `${selectedPlan.laneAnalyticsHistoryDays} gün`
                            : "Kapalı"}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="platform-admin-empty">Plan katalogda bulunamadı.</p>
                  )}
                </section>

                <section className="admin-panel-card admin-users-detail-wide">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Dahil modüller</h2>
                      <p>Aktif planın yetki seti</p>
                    </div>
                  </header>
                  {selectedPlan?.includedModules?.length ? (
                    <ul className="admin-subscriptions-module-list">
                      {selectedPlan.includedModules.map((mod) => (
                        <li key={mod}>
                          <span className="admin-org-badge admin-org-badge--ok">
                            {formatModuleCode(mod)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="platform-admin-empty">Modül listesi yok.</p>
                  )}
                </section>

                <section className="admin-panel-card admin-users-detail-wide">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Plan kataloğu</h2>
                      <p>Sistemde tanımlı tüm paketler ({plans.length})</p>
                    </div>
                  </header>
                  <ul className="admin-subscriptions-catalog">
                    {plans.map((plan) => (
                      <li key={plan.planCode}>
                        <strong>{formatPlanLabel(plan.planCode)}</strong>
                        <span>{formatTierLabel(plan.tierCode)}</span>
                        <code>{plan.planCode}</code>
                      </li>
                    ))}
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
