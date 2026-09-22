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

type EnrichedBilling = SubRow & {
  participantTypeCode: string | null;
  tierCode: string;
  billingStatus: "pending" | "demo_paid";
};

type StatusFilter = "all" | "pending" | "demo_paid";

type PlanFilter = "all" | string;

type TypeFilter = "all" | "LOAD_SHIPPER" | "LOAD_CARRIER" | "LOAD_SEEKER" | "other";

const PLAN_COLORS: Record<string, string> = {
  carrier_starter_tr_ua: "#64748b",
  carrier_professional_tr_ua: "#2563eb",
  forwarder_enterprise_tr_ua: "#0d9488",
};

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

function demoBillingStatus(companyId: string): "pending" | "demo_paid" {
  let hash = 0;
  for (let i = 0; i < companyId.length; i++) {
    hash = (hash + companyId.charCodeAt(i)) % 5;
  }
  return hash === 0 ? "demo_paid" : "pending";
}

function formatBillingStatus(status: EnrichedBilling["billingStatus"]): string {
  return status === "demo_paid" ? "Demo tahsil edildi" : "Tahsilat bekliyor";
}

export function AdminPaymentsPageClient() {
  const { accessToken } = useWebSession();
  const [rows, setRows] = useState<EnrichedBilling[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
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
      const planMap = new Map(payload.plans.map((p) => [p.planCode, p.tierCode]));

      const active = payload.subscriptions.filter((s) => s.isActive);
      const enriched: EnrichedBilling[] = active.map((sub) => ({
        ...sub,
        participantTypeCode:
          companyMap.get(sub.companyId)?.participantTypeCode ?? null,
        tierCode: planMap.get(sub.planCode) ?? "—",
        billingStatus: demoBillingStatus(sub.companyId),
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

  const summary = useMemo(() => {
    const byPlan = new Map<string, number>();
    const byTier = { starter: 0, professional: 0, enterprise: 0, other: 0 };
    let pending = 0;
    let demoPaid = 0;

    for (const row of rows) {
      byPlan.set(row.planCode, (byPlan.get(row.planCode) ?? 0) + 1);
      switch (row.tierCode) {
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
      if (row.billingStatus === "demo_paid") {
        demoPaid++;
      } else {
        pending++;
      }
    }

    return { total: rows.length, pending, demoPaid, byPlan, byTier };
  }, [rows]);

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

  const planOptions = useMemo(
    () => [...new Set(rows.map((r) => r.planCode))].sort(),
    [rows],
  );

  const q = filter.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (statusFilter !== "all" && row.billingStatus !== statusFilter) {
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
      formatPlanLabel(row.planCode).toLowerCase().includes(q)
    );
  });

  const selected = rows.find((r) => r.id === selectedId) ?? filtered[0];

  const statusFilters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "Tümü" },
    { id: "pending", label: "Bekleyen" },
    { id: "demo_paid", label: "Demo tahsil" },
  ];

  const typeFilters: { id: TypeFilter; label: string }[] = [
    { id: "all", label: "Tüm firmalar" },
    { id: "LOAD_SHIPPER", label: "Yük veren" },
    { id: "LOAD_CARRIER", label: "Taşıyan" },
    { id: "LOAD_SEEKER", label: "Arayan" },
  ];

  return (
    <div className="platform-admin-command admin-payments-premium">
      <header className="platform-admin-command-hero">
        <div>
          <p className="platform-admin-command-eyebrow">Gelir operasyonları</p>
          <h1 className="platform-admin-command-title">Ödemeler ve faturalar</h1>
          <p className="platform-admin-command-sub">
            Fatura entegrasyonu yok; aktif abonelikler tahsilat kuyruğu olarak listelenir
          </p>
        </div>
        <div className="platform-admin-command-hero-meta">
          <span className="admin-status-pill admin-status-pill--ok">
            {summary.pending} bekleyen tahsilat
          </span>
          <button type="button" className="admin-btn-ghost-light" onClick={() => void refresh()}>
            Yenile
          </button>
        </div>
      </header>

      <section className="admin-kpi-row admin-payments-kpi-row" aria-label="Ödeme özet">
        <article className="admin-kpi-card admin-kpi-card--primary">
          <span className="admin-kpi-label">Aktif paket</span>
          <p className="admin-kpi-value">{summary.total}</p>
          <span className="admin-kpi-hint">Faturalanacak satır</span>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Bekleyen</span>
          <p className="admin-kpi-value">{summary.pending}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Demo tahsil</span>
          <p className="admin-kpi-value">{summary.demoPaid}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Kurumsal</span>
          <p className="admin-kpi-value">{summary.byTier.enterprise}</p>
        </article>
        <article className="admin-panel-card admin-org-donut-card">
          {donutSegments.length > 0 ? (
            <AdminDonutChart
              segments={donutSegments}
              centerLabel="Paket"
              centerValue={String(summary.total)}
            />
          ) : (
            <p className="platform-admin-empty">Veri yok</p>
          )}
        </article>
      </section>

      <section className="admin-panel-card admin-payments-tier-chart">
        <header className="admin-panel-card-head">
          <div>
            <h2>Katman bazlı tahsilat kuyruğu</h2>
            <p>Aktif abonelikler (demo durum simülasyonu)</p>
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

      <div className="admin-org-layout admin-org-layout--premium admin-payments-layout">
        <aside className="admin-org-sidebar admin-panel-card">
          <header className="admin-org-sidebar-head">
            <h2>Tahsilat dizini</h2>
            <p>{filtered.length} / {rows.length}</p>
          </header>
          <label className="admin-field">
            <span>Ara</span>
            <input
              className="admin-input"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Firma, paket"
            />
          </label>
          <div className="admin-org-type-filters" role="tablist" aria-label="Tahsilat">
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
          <div className="admin-org-type-filters admin-payments-plan-filters">
            <button
              type="button"
              className={
                planFilter === "all"
                  ? "admin-org-type-chip active"
                  : "admin-org-type-chip"
              }
              onClick={() => setPlanFilter("all")}
            >
              Tüm paketler
            </button>
            {planOptions.map((code) => (
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
          <div className="admin-org-type-filters admin-payments-type-filters">
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
                          row.billingStatus === "demo_paid"
                            ? "admin-org-badge admin-org-badge--ok"
                            : "admin-org-badge admin-org-badge--warn"
                        }
                      >
                        {formatBillingStatus(row.billingStatus)}
                      </span>
                    </span>
                    <span className="admin-payments-list-plan">
                      {formatPlanLabel(row.planCode)}
                    </span>
                    <span className="admin-org-company-meta">
                      <span>{formatTierLabel(row.tierCode)}</span>
                      <span>{formatParticipantType(row.participantTypeCode)}</span>
                    </span>
                  </button>
                </li>
              ))}
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
                  <h2>{selected.companyLegalName}</h2>
                  <p className="admin-payments-detail-plan">{formatPlanLabel(selected.planCode)}</p>
                  <div className="admin-org-detail-pills">
                    <span
                      className={
                        selected.billingStatus === "demo_paid"
                          ? "admin-org-badge admin-org-badge--ok"
                          : "admin-org-badge admin-org-badge--warn"
                      }
                    >
                      {formatBillingStatus(selected.billingStatus)}
                    </span>
                    <span className="admin-org-badge">{formatTierLabel(selected.tierCode)}</span>
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
                  <Link href="/admin/abonelikler" className="admin-btn-secondary">
                    Abonelikler
                  </Link>
                </div>
              </header>

              <div className="admin-users-detail-grid admin-payments-detail-grid">
                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Abonelik bağlantısı</h2>
                      <p>Aktif paket satırı</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>Abonelik ID</dt>
                      <dd><code>{selected.id}</code></dd>
                    </div>
                    <div>
                      <dt>Plan kodu</dt>
                      <dd><code>{selected.planCode}</code></dd>
                    </div>
                    <div>
                      <dt>Başlangıç</dt>
                      <dd>
                        {new Date(selected.createdAt).toLocaleDateString("tr-TR", {
                          dateStyle: "medium",
                        })}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Tahsilat (demo)</h2>
                      <p>Gerçek ödeme sağlayıcısı bağlı değil</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>Durum</dt>
                      <dd>{formatBillingStatus(selected.billingStatus)}</dd>
                    </div>
                    <div>
                      <dt>Fatura</dt>
                      <dd>—</dd>
                    </div>
                    <div>
                      <dt>Son işlem</dt>
                      <dd>—</dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card admin-users-detail-wide">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Plan kataloğu referansı</h2>
                      <p>{plans.length} sistem paketi</p>
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

                <section className="admin-panel-card admin-users-detail-wide">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Operatör notları</h2>
                      <p>iyzico / Stripe entegrasyonu planlanıyor</p>
                    </div>
                  </header>
                  <ul className="admin-checklist admin-users-checklist">
                    <li>Tahsilat durumu şimdilik deterministik demo (firma ID hash)</li>
                    <li>Gerçek fatura PDF ve e-Fatura sonraki sürüm</li>
                    <li>Üye ödemeler: /hesap/odemeler</li>
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
