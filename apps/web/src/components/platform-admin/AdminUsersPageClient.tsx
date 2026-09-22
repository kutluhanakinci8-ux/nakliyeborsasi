"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlatformAdminApiClient,
  formatParticipantType,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";
import { AdminBarChart, AdminDonutChart } from "./AdminDashboardCharts";

type UserRow = Awaited<
  ReturnType<typeof PlatformAdminApiClient.fetchUsers>
>[number];

type TypeFilter = "all" | "LOAD_SHIPPER" | "LOAD_CARRIER" | "LOAD_SEEKER" | "other";

type RoleFilter = "all" | "COMPANY_OWNER" | "DISPATCHER" | "other";

function participantKey(code: string | null | undefined): TypeFilter {
  if (code === "LOAD_SHIPPER" || code === "LOAD_CARRIER" || code === "LOAD_SEEKER") {
    return code;
  }
  return "other";
}

function formatRoleCode(code: string): string {
  switch (code) {
    case "COMPANY_OWNER":
      return "Firma sahibi";
    case "DISPATCHER":
      return "Dispetcher";
    case "VIEWER":
      return "İzleyici";
    case "BILLING_ADMIN":
      return "Fatura yöneticisi";
    default:
      return code;
  }
}

function rowKey(row: UserRow): string {
  return `${row.id}:${row.companyId}`;
}

export function AdminUsersPageClient() {
  const { accessToken } = useWebSession();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [selectedKey, setSelectedKey] = useState("");

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const users = await PlatformAdminApiClient.fetchUsers(accessToken);
      setRows(users);
      setSelectedKey((current) => current || (users[0] ? rowKey(users[0]) : ""));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(() => {
    const uniqueEmails = new Set(rows.map((r) => r.emailAddress.toLowerCase()));
    const breakdown = { loadShipper: 0, loadCarrier: 0, loadSeeker: 0, other: 0 };
    const roles = { owner: 0, dispatcher: 0, other: 0 };
    let testAccounts = 0;

    for (const row of rows) {
      switch (participantKey(row.participantTypeCode)) {
        case "LOAD_SHIPPER":
          breakdown.loadShipper++;
          break;
        case "LOAD_CARRIER":
          breakdown.loadCarrier++;
          break;
        case "LOAD_SEEKER":
          breakdown.loadSeeker++;
          break;
        default:
          breakdown.other++;
      }
      const primaryRole = row.roleCodes[0] ?? "";
      if (primaryRole === "COMPANY_OWNER") {
        roles.owner++;
      } else if (primaryRole === "DISPATCHER") {
        roles.dispatcher++;
      } else {
        roles.other++;
      }
      if (row.emailAddress.includes("@test.nakliyeborsasi.local")) {
        testAccounts++;
      }
    }

    return {
      memberships: rows.length,
      uniqueUsers: uniqueEmails.size,
      breakdown,
      roles,
      testAccounts,
    };
  }, [rows]);

  const donutSegments = useMemo(
    () =>
      [
        { label: "Yük veren", value: summary.breakdown.loadShipper, color: "#0d9488" },
        { label: "Yük taşıyan", value: summary.breakdown.loadCarrier, color: "#2563eb" },
        { label: "Yük arayan", value: summary.breakdown.loadSeeker, color: "#d97706" },
        { label: "Diğer", value: summary.breakdown.other, color: "#64748b" },
      ].filter((s) => s.value > 0),
    [summary.breakdown],
  );

  const q = filter.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (typeFilter !== "all" && participantKey(row.participantTypeCode) !== typeFilter) {
      return false;
    }
    if (roleFilter !== "all") {
      const primary = row.roleCodes[0] ?? "";
      if (roleFilter === "other") {
        if (primary === "COMPANY_OWNER" || primary === "DISPATCHER") {
          return false;
        }
      } else if (!row.roleCodes.includes(roleFilter)) {
        return false;
      }
    }
    if (!q) {
      return true;
    }
    return (
      row.emailAddress.toLowerCase().includes(q) ||
      row.displayName.toLowerCase().includes(q) ||
      row.companyLegalName.toLowerCase().includes(q) ||
      row.id.toLowerCase().includes(q)
    );
  });

  const selected = rows.find((r) => rowKey(r) === selectedKey) ?? filtered[0];

  const typeFilters: { id: TypeFilter; label: string }[] = [
    { id: "all", label: "Tümü" },
    { id: "LOAD_SHIPPER", label: "Yük veren" },
    { id: "LOAD_CARRIER", label: "Taşıyan" },
    { id: "LOAD_SEEKER", label: "Arayan" },
    { id: "other", label: "Diğer" },
  ];

  const roleFilters: { id: RoleFilter; label: string }[] = [
    { id: "all", label: "Tüm roller" },
    { id: "COMPANY_OWNER", label: "Firma sahibi" },
    { id: "DISPATCHER", label: "Dispetcher" },
    { id: "other", label: "Diğer" },
  ];

  return (
    <div className="platform-admin-command admin-users-premium">
      <header className="platform-admin-command-hero">
        <div>
          <p className="platform-admin-command-eyebrow">Firmalar ve hesaplar</p>
          <h1 className="platform-admin-command-title">Kullanıcılar</h1>
          <p className="platform-admin-command-sub">
            Üye hesapları ve firma üyelikleri — test şifre: TestPass123!
          </p>
        </div>
        <div className="platform-admin-command-hero-meta">
          <span className="admin-status-pill admin-status-pill--ok">
            {summary.uniqueUsers} benzersiz kullanıcı
          </span>
          <button type="button" className="admin-btn-ghost-light" onClick={() => void refresh()}>
            Yenile
          </button>
        </div>
      </header>

      <section className="admin-kpi-row admin-users-kpi-row" aria-label="Kullanıcı özet">
        <article className="admin-kpi-card admin-kpi-card--primary">
          <span className="admin-kpi-label">Benzersiz kullanıcı</span>
          <p className="admin-kpi-value">{summary.uniqueUsers}</p>
          <span className="admin-kpi-hint">{summary.memberships} firma üyeliği</span>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Test hesabı</span>
          <p className="admin-kpi-value">{summary.testAccounts}</p>
          <span className="admin-kpi-hint">@test.nakliyeborsasi.local</span>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Firma sahibi</span>
          <p className="admin-kpi-value">{summary.roles.owner}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Dispetcher</span>
          <p className="admin-kpi-value">{summary.roles.dispatcher}</p>
        </article>
        <article className="admin-panel-card admin-org-donut-card">
          {donutSegments.length > 0 ? (
            <AdminDonutChart
              segments={donutSegments}
              centerLabel="Üyelik"
              centerValue={String(summary.memberships)}
            />
          ) : (
            <p className="platform-admin-empty">Veri yok</p>
          )}
        </article>
      </section>

      <section className="admin-panel-card admin-users-role-chart">
        <header className="admin-panel-card-head">
          <div>
            <h2>Rol dağılımı</h2>
            <p>Firma içi yetki profili (üyelik bazlı)</p>
          </div>
        </header>
        <AdminBarChart
          items={[
            {
              label: "Firma sahibi",
              value: summary.roles.owner,
              displayValue: String(summary.roles.owner),
              color: "#1e3a5f",
            },
            {
              label: "Dispetcher",
              value: summary.roles.dispatcher,
              displayValue: String(summary.roles.dispatcher),
              color: "#2563eb",
            },
            {
              label: "Diğer roller",
              value: summary.roles.other,
              displayValue: String(summary.roles.other),
              color: "#94a3b8",
            },
          ]}
        />
      </section>

      <div className="admin-org-layout admin-org-layout--premium admin-users-layout">
        <aside className="admin-org-sidebar admin-panel-card">
          <header className="admin-org-sidebar-head">
            <h2>Hesap dizini</h2>
            <p>{filtered.length} / {rows.length}</p>
          </header>
          <label className="admin-field">
            <span>Ara</span>
            <input
              className="admin-input"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="E-posta, ad, firma"
            />
          </label>
          <div className="admin-org-type-filters" role="tablist" aria-label="Pazar rolü">
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
          <div className="admin-org-type-filters admin-users-role-filters">
            {roleFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  roleFilter === item.id
                    ? "admin-org-type-chip active"
                    : "admin-org-type-chip"
                }
                onClick={() => setRoleFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {loading ? (
            <p className="platform-admin-loading-inline">Liste yükleniyor…</p>
          ) : (
            <ul className="admin-org-company-list admin-org-company-list--premium">
              {filtered.map((row) => {
                const key = rowKey(row);
                const isTest = row.emailAddress.includes("@test.nakliyeborsasi.local");
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className={
                        selectedKey === key
                          ? "admin-org-company admin-org-company--premium active"
                          : "admin-org-company admin-org-company--premium"
                      }
                      onClick={() => setSelectedKey(key)}
                    >
                      <span className="admin-org-company-top">
                        <strong>{row.displayName}</strong>
                        {isTest ? (
                          <span className="admin-org-badge admin-org-badge--ok">Test</span>
                        ) : null}
                      </span>
                      <span className="admin-users-list-email">{row.emailAddress}</span>
                      <span className="admin-org-company-meta">
                        <span className="admin-org-badge">
                          {formatParticipantType(row.participantTypeCode)}
                        </span>
                        <span>{formatRoleCode(row.roleCodes[0] ?? "—")}</span>
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
            <p className="platform-admin-empty">Kullanıcı seçin.</p>
          ) : (
            <>
              <header className="admin-org-detail-hero admin-panel-card">
                <div>
                  <h2>{selected.displayName}</h2>
                  <p className="admin-users-detail-email">{selected.emailAddress}</p>
                  <div className="admin-org-detail-pills">
                    <span className="admin-org-badge">
                      {formatParticipantType(selected.participantTypeCode)}
                    </span>
                    {selected.roleCodes.map((role) => (
                      <span key={role} className="admin-org-badge admin-org-badge--ok">
                        {formatRoleCode(role)}
                      </span>
                    ))}
                    {selected.emailAddress.includes("@test.nakliyeborsasi.local") ? (
                      <span className="admin-org-badge">TestPass123!</span>
                    ) : null}
                  </div>
                </div>
                <div className="admin-org-detail-stats admin-users-detail-actions">
                  <Link
                    href={`/admin/organizasyon?firma=${selected.companyId}`}
                    className="admin-btn-primary"
                  >
                    Firmayı yönet
                  </Link>
                  <Link href="/login" className="admin-btn-secondary" target="_blank" rel="noreferrer">
                    Üye giriş ekranı
                  </Link>
                </div>
              </header>

              <div className="admin-users-detail-grid">
                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Kimlik</h2>
                      <p>API kayıtlı kullanıcı</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>Kullanıcı ID</dt>
                      <dd><code>{selected.id}</code></dd>
                    </div>
                    <div>
                      <dt>Görünen ad</dt>
                      <dd>{selected.displayName}</dd>
                    </div>
                    <div>
                      <dt>E-posta</dt>
                      <dd>{selected.emailAddress}</dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Firma üyeliği</h2>
                      <p>Organizasyon bağlantısı</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>Firma</dt>
                      <dd>{selected.companyLegalName}</dd>
                    </div>
                    <div>
                      <dt>Firma ID</dt>
                      <dd><code>{selected.companyId}</code></dd>
                    </div>
                    <div>
                      <dt>Pazar rolü</dt>
                      <dd>{formatParticipantType(selected.participantTypeCode)}</dd>
                    </div>
                    <div>
                      <dt>Sistem rolü</dt>
                      <dd>{selected.roleCodes.map(formatRoleCode).join(", ")}</dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card admin-users-detail-wide">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Operatör notları</h2>
                      <p>Askıya alma ve şifre sıfırlama sonraki sürümde API ile bağlanacak</p>
                    </div>
                  </header>
                  <ul className="admin-checklist admin-users-checklist">
                    <li>Üye oturumu: standart JWT (12 saat)</li>
                    <li>Firma dondurma: Organizasyon → Güven ve doğrulama</li>
                    <li>Test kullanıcıları: docs/TEST_USERS.md</li>
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
