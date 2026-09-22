"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "../EmptyState";
import { addManualCompanyId, loadManualCompanyIds } from "../../lib/adminCompanyDirectory";
import {
  PlatformAdminApiClient,
  formatParticipantType,
} from "../../lib/PlatformAdminApiClient";
import {
  CORRIDOR_OPTIONS,
  appendOrganizationAudit,
  defaultAdminSettings,
  defaultOrganizationProfile,
  loadOrganizationAdminSettings,
  loadOrganizationAudit,
  loadOrganizationProfile,
  saveOrganizationAdminSettings,
  saveOrganizationProfile,
  type OrganizationAdminSettings,
  type OrganizationAuditEntry,
  type OrganizationProfile,
} from "../../lib/organizationProfile";
import { useWebSession } from "../../context/WebSessionProvider";
import { AdminDonutChart } from "./AdminDashboardCharts";

type ApiCompany = Awaited<
  ReturnType<typeof PlatformAdminApiClient.fetchCompanies>
>[number];

type TypeFilter = "all" | "LOAD_SHIPPER" | "LOAD_CARRIER" | "LOAD_SEEKER" | "other";

type OrgTab = "trust" | "profile" | "corridor" | "contact" | "audit";

function participantKey(code: string | null): TypeFilter {
  if (code === "LOAD_SHIPPER" || code === "LOAD_CARRIER" || code === "LOAD_SEEKER") {
    return code;
  }
  return "other";
}

export function AdminOrganizationPageClient() {
  const searchParams = useSearchParams();
  const firmaFromQuery = searchParams.get("firma");
  const { session, accessToken } = useWebSession();
  const actorEmail = session?.emailAddress ?? "admin";
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [profile, setProfile] = useState<OrganizationProfile>(() =>
    defaultOrganizationProfile(""),
  );
  const [adminSettings, setAdminSettings] = useState<OrganizationAdminSettings>(
    defaultAdminSettings(),
  );
  const [auditLog, setAuditLog] = useState<OrganizationAuditEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [manualId, setManualId] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<OrgTab>("trust");
  const [loading, setLoading] = useState(true);
  const mainPanelRef = useRef<HTMLDivElement>(null);

  const refreshDirectory = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const apiCompanies = await PlatformAdminApiClient.fetchCompanies(accessToken);
      const map = new Map(apiCompanies.map((c) => [c.id, c]));
      for (const id of loadManualCompanyIds()) {
        if (!map.has(id)) {
          map.set(id, {
            id,
            legalName: `Manuel kayıt · ${id.slice(0, 8)}`,
            countryCode: "—",
            participantTypeCode: null,
            userCount: 0,
            listingCount: 0,
            activePlanCode: null,
          });
        }
      }
      const list = [...map.values()].sort((a, b) =>
        a.legalName.localeCompare(b.legalName, "tr"),
      );
      setCompanies(list);
      setSelectedId((current) => current || list[0]?.id || "");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refreshDirectory();
  }, [refreshDirectory]);

  useEffect(() => {
    if (firmaFromQuery) {
      setSelectedId(firmaFromQuery);
    }
  }, [firmaFromQuery]);

  useEffect(() => {
    if (!selectedId || !mainPanelRef.current) {
      return;
    }
    if (window.matchMedia("(max-width: 1100px)").matches) {
      mainPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedId]);

  const selectedCompany = companies.find((c) => c.id === selectedId);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const loadedProfile = loadOrganizationProfile(selectedId);
    const apiName = selectedCompany?.legalName ?? "";
    setProfile({
      ...loadedProfile,
      tradeName: loadedProfile.tradeName || apiName,
      legalName: loadedProfile.legalName || apiName,
    });
    setAdminSettings(loadOrganizationAdminSettings(selectedId));
    setAuditLog(loadOrganizationAudit(selectedId));
  }, [selectedId, selectedCompany?.legalName]);

  const summary = useMemo(() => {
    let frozen = 0;
    let pendingDocs = 0;
    let verified = 0;
    const breakdown = { loadShipper: 0, loadCarrier: 0, loadSeeker: 0, other: 0 };
    for (const company of companies) {
      const settings = loadOrganizationAdminSettings(company.id);
      if (settings.accountFrozen) {
        frozen++;
      }
      if (settings.documentStatus === "pending") {
        pendingDocs++;
      }
      if (settings.emailVerified && settings.documentStatus === "approved") {
        verified++;
      }
      switch (company.participantTypeCode) {
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
    }
    return { frozen, pendingDocs, verified, breakdown };
  }, [companies]);

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

  function flash(text: string): void {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 4000);
  }

  function saveAll(summaryText: string): void {
    if (!selectedId) {
      return;
    }
    const nextAdmin: OrganizationAdminSettings = {
      ...adminSettings,
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail,
    };
    saveOrganizationProfile(selectedId, profile);
    saveOrganizationAdminSettings(selectedId, nextAdmin);
    appendOrganizationAudit(selectedId, actorEmail, summaryText);
    setAdminSettings(nextAdmin);
    setAuditLog(loadOrganizationAudit(selectedId));
    flash(summaryText);
  }

  function handleProfileSubmit(event: FormEvent): void {
    event.preventDefault();
    saveAll("Organizasyon profili kaydedildi.");
  }

  function handleAdminSubmit(event: FormEvent): void {
    event.preventDefault();
    saveAll("Doğrulama ve operasyon ayarları kaydedildi.");
  }

  function toggleCorridor(code: string): void {
    setProfile((current) => {
      const has = current.corridors.includes(code);
      const corridors = has
        ? current.corridors.filter((c) => c !== code)
        : [...current.corridors, code];
      return { ...current, corridors };
    });
  }

  function addCompany(): void {
    const id = manualId.trim();
    if (!id) {
      return;
    }
    addManualCompanyId(id);
    setManualId("");
    void refreshDirectory().then(() => setSelectedId(id));
    flash("Firma dizine eklendi.");
  }

  const q = filter.trim().toLowerCase();
  const filtered = companies.filter((item) => {
    if (typeFilter !== "all" && participantKey(item.participantTypeCode) !== typeFilter) {
      return false;
    }
    if (!q) {
      return true;
    }
    return (
      item.id.toLowerCase().includes(q) ||
      item.legalName.toLowerCase().includes(q) ||
      (item.participantTypeCode ?? "").toLowerCase().includes(q)
    );
  });

  const typeFilters: { id: TypeFilter; label: string }[] = [
    { id: "all", label: "Tümü" },
    { id: "LOAD_SHIPPER", label: "Yük veren" },
    { id: "LOAD_CARRIER", label: "Taşıyan" },
    { id: "LOAD_SEEKER", label: "Arayan" },
    { id: "other", label: "Diğer" },
  ];

  return (
    <div className="platform-admin-command admin-org-premium">
      <header className="platform-admin-command-hero">
        <div>
          <p className="platform-admin-command-eyebrow">Firmalar ve hesaplar</p>
          <h1 className="platform-admin-command-title">Organizasyonlar</h1>
          <p className="platform-admin-command-sub">
            Doğrulama, koridor, dondurma ve profil — üye organizasyon sayfası ile senkron
          </p>
        </div>
        <div className="platform-admin-command-hero-meta">
          <span className="admin-status-pill admin-status-pill--ok">
            {companies.length} kayıtlı firma
          </span>
          <button
            type="button"
            className="admin-btn-ghost-light"
            onClick={() => void refreshDirectory()}
          >
            Yenile
          </button>
        </div>
      </header>

      <section className="admin-kpi-row admin-org-kpi-row" aria-label="Organizasyon özet">
        <article className="admin-kpi-card admin-kpi-card--primary">
          <span className="admin-kpi-label">Toplam organizasyon</span>
          <p className="admin-kpi-value">{companies.length}</p>
          <span className="admin-kpi-hint">API + manuel kayıt</span>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Doğrulanmış</span>
          <p className="admin-kpi-value">{summary.verified}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Belge bekliyor</span>
          <p className="admin-kpi-value">{summary.pendingDocs}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Dondurulmuş</span>
          <p className="admin-kpi-value">{summary.frozen}</p>
        </article>
        <article className="admin-panel-card admin-org-donut-card">
          {donutSegments.length > 0 ? (
            <AdminDonutChart
              segments={donutSegments}
              centerLabel="Rol"
              centerValue={String(companies.length)}
            />
          ) : (
            <p className="platform-admin-empty">Dağılım yok</p>
          )}
        </article>
      </section>

      <div className="admin-org-layout admin-org-layout--premium">
        <aside className="admin-org-sidebar admin-panel-card">
          <header className="admin-org-sidebar-head">
            <h2>Firma dizini</h2>
            <p>{filtered.length} / {companies.length}</p>
          </header>
          <label className="admin-field">
            <span>Ara</span>
            <input
              className="admin-input"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Unvan, rol veya ID"
            />
          </label>
          <div className="admin-org-type-filters" role="tablist" aria-label="Rol filtresi">
            {typeFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={typeFilter === item.id}
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
          <div className="admin-org-add">
            <input
              className="admin-input"
              value={manualId}
              onChange={(event) => setManualId(event.target.value)}
              placeholder="UUID ekle"
            />
            <button type="button" className="admin-btn-secondary" onClick={addCompany}>
              Ekle
            </button>
          </div>
          {loading ? (
            <p className="platform-admin-loading-inline">Liste yükleniyor…</p>
          ) : (
            <ul className="admin-org-company-list admin-org-company-list--premium">
              {filtered.map((item) => {
                const settings = loadOrganizationAdminSettings(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={
                        selectedId === item.id
                          ? "admin-org-company admin-org-company--premium active"
                          : "admin-org-company admin-org-company--premium"
                      }
                      onClick={() => setSelectedId(item.id)}
                    >
                      <span className="admin-org-company-top">
                        <strong>{item.legalName}</strong>
                        {settings.accountFrozen ? (
                          <span className="admin-org-badge admin-org-badge--danger">Donduruldu</span>
                        ) : null}
                      </span>
                      <span className="admin-org-company-meta">
                        <span className="admin-org-badge">
                          {formatParticipantType(item.participantTypeCode)}
                        </span>
                        <span>{item.userCount} kullanıcı · {item.listingCount} ilan</span>
                      </span>
                      <code>{item.id.slice(0, 8)}…</code>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="admin-org-main" ref={mainPanelRef}>
          {!selectedId ? (
            <EmptyState message="Soldan firma seçin veya UUID ekleyin." />
          ) : (
            <>
              <header className="admin-org-detail-hero admin-panel-card">
                <div>
                  <h2>{profile.tradeName || selectedCompany?.legalName || "Organizasyon"}</h2>
                  <p>
                    <code>{selectedId}</code>
                    {selectedCompany?.countryCode ? ` · ${selectedCompany.countryCode}` : ""}
                    {selectedCompany?.activePlanCode
                      ? ` · ${selectedCompany.activePlanCode}`
                      : ""}
                  </p>
                  <div className="admin-org-detail-pills">
                    <span className="admin-org-badge">
                      {formatParticipantType(selectedCompany?.participantTypeCode)}
                    </span>
                    {adminSettings.accountFrozen ? (
                      <span className="admin-org-badge admin-org-badge--danger">Hesap donduruldu</span>
                    ) : (
                      <span className="admin-org-badge admin-org-badge--ok">Aktif</span>
                    )}
                    {adminSettings.emailVerified ? (
                      <span className="admin-org-badge admin-org-badge--ok">E-posta onaylı</span>
                    ) : null}
                    <span className="admin-org-badge">Belge: {adminSettings.documentStatus}</span>
                  </div>
                </div>
                <div className="admin-org-detail-stats">
                  <div>
                    <strong>{selectedCompany?.userCount ?? 0}</strong>
                    <span>Kullanıcı</span>
                  </div>
                  <div>
                    <strong>{selectedCompany?.listingCount ?? 0}</strong>
                    <span>İlan</span>
                  </div>
                  <Link href="/hesap/organizasyon" className="admin-btn-secondary">
                    Üye görünümü
                  </Link>
                </div>
              </header>

              {message ? <p className="admin-org-toast">{message}</p> : null}

              <nav className="admin-org-tabs" aria-label="Organizasyon bölümleri">
                {(
                  [
                    ["trust", "Güven ve doğrulama"],
                    ["profile", "Temel bilgiler"],
                    ["corridor", "Koridor"],
                    ["contact", "İletişim"],
                    ["audit", "Denetim"],
                  ] as [OrgTab, string][]
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    className={activeTab === tab ? "admin-org-tab active" : "admin-org-tab"}
                    onClick={() => setActiveTab(tab)}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {activeTab === "trust" ? (
                <form className="admin-panel-card" onSubmit={handleAdminSubmit}>
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Güven ve doğrulama</h2>
                      <p>Üye organizasyon sayfasındaki rozetler ve kısıtlar</p>
                    </div>
                    <button type="submit" className="admin-btn-primary">Kaydet</button>
                  </header>
                  <div className="admin-form-grid">
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={adminSettings.emailVerified}
                        onChange={(event) =>
                          setAdminSettings((c) => ({
                            ...c,
                            emailVerified: event.target.checked,
                          }))
                        }
                      />
                      E-posta onaylı
                    </label>
                    <label className="admin-field">
                      <span>Belge durumu</span>
                      <select
                        className="admin-input"
                        value={adminSettings.documentStatus}
                        onChange={(event) =>
                          setAdminSettings((c) => ({
                            ...c,
                            documentStatus: event.target
                              .value as OrganizationAdminSettings["documentStatus"],
                          }))
                        }
                      >
                        <option value="pending">Bekleniyor</option>
                        <option value="approved">Onaylı</option>
                        <option value="rejected">Reddedildi</option>
                      </select>
                    </label>
                    <label className="admin-field">
                      <span>Doğrulama seviyesi</span>
                      <select
                        className="admin-input"
                        value={adminSettings.verificationLevel}
                        onChange={(event) =>
                          setAdminSettings((c) => ({
                            ...c,
                            verificationLevel: event.target.value as "basic" | "full",
                          }))
                        }
                      >
                        <option value="basic">Temel</option>
                        <option value="full">Tam</option>
                      </select>
                    </label>
                    <label className="admin-field">
                      <span>Destek kayıt no</span>
                      <input
                        className="admin-input"
                        value={adminSettings.supportTicketRef}
                        onChange={(event) =>
                          setAdminSettings((c) => ({
                            ...c,
                            supportTicketRef: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="admin-field admin-field--span-2">
                      <span>Admin notu</span>
                      <textarea
                        className="admin-input admin-textarea"
                        rows={3}
                        value={adminSettings.adminNotes}
                        onChange={(event) =>
                          setAdminSettings((c) => ({
                            ...c,
                            adminNotes: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className="admin-toggle-row">
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={adminSettings.featuredInSearch}
                        onChange={(event) =>
                          setAdminSettings((c) => ({
                            ...c,
                            featuredInSearch: event.target.checked,
                          }))
                        }
                      />
                      Öne çıkan arama
                    </label>
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={adminSettings.allowNewListings}
                        onChange={(event) =>
                          setAdminSettings((c) => ({
                            ...c,
                            allowNewListings: event.target.checked,
                          }))
                        }
                      />
                      Yeni ilan izni
                    </label>
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={adminSettings.allowAuctions}
                        onChange={(event) =>
                          setAdminSettings((c) => ({
                            ...c,
                            allowAuctions: event.target.checked,
                          }))
                        }
                      />
                      İhale izni
                    </label>
                    <label className="admin-checkbox admin-checkbox--danger">
                      <input
                        type="checkbox"
                        checked={adminSettings.accountFrozen}
                        onChange={(event) =>
                          setAdminSettings((c) => ({
                            ...c,
                            accountFrozen: event.target.checked,
                          }))
                        }
                      />
                      Hesabı dondur
                    </label>
                  </div>
                </form>
              ) : null}

              {activeTab === "profile" ? (
                <form className="admin-panel-card" onSubmit={handleProfileSubmit}>
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Temel bilgiler</h2>
                      <p>Ticari ve resmi unvan</p>
                    </div>
                    <button type="submit" className="admin-btn-primary">Kaydet</button>
                  </header>
                  <div className="admin-form-grid">
                    <label className="admin-field">
                      <span>Ticari unvan</span>
                      <input
                        className="admin-input"
                        value={profile.tradeName}
                        onChange={(event) =>
                          setProfile((c) => ({ ...c, tradeName: event.target.value }))
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Resmi unvan</span>
                      <input
                        className="admin-input"
                        value={profile.legalName}
                        onChange={(event) =>
                          setProfile((c) => ({ ...c, legalName: event.target.value }))
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Vergi / TIN</span>
                      <input
                        className="admin-input"
                        value={profile.taxNumber}
                        onChange={(event) =>
                          setProfile((c) => ({ ...c, taxNumber: event.target.value }))
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Ülke</span>
                      <select
                        className="admin-input"
                        value={profile.countryCode}
                        onChange={(event) =>
                          setProfile((c) => ({ ...c, countryCode: event.target.value }))
                        }
                      >
                        <option value="TR">TR</option>
                        <option value="UA">UA</option>
                        <option value="PL">PL</option>
                        <option value="DE">DE</option>
                        <option value="RO">RO</option>
                      </select>
                    </label>
                    <label className="admin-field admin-field--span-2">
                      <span>Şehir</span>
                      <input
                        className="admin-input"
                        value={profile.city}
                        onChange={(event) =>
                          setProfile((c) => ({ ...c, city: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                </form>
              ) : null}

              {activeTab === "corridor" ? (
                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Koridor yetkileri</h2>
                      <p>TR · UA · EU erişimleri</p>
                    </div>
                    <button
                      type="button"
                      className="admin-btn-primary"
                      onClick={() => saveAll("Koridor yetkileri güncellendi.")}
                    >
                      Kaydet
                    </button>
                  </header>
                  <div className="account-corridor-toggles">
                    {CORRIDOR_OPTIONS.map((corridor) => {
                      const active = profile.corridors.includes(corridor.code);
                      return (
                        <button
                          key={corridor.code}
                          type="button"
                          className={
                            active ? "account-corridor-chip active" : "account-corridor-chip"
                          }
                          onClick={() => toggleCorridor(corridor.code)}
                        >
                          <span className="account-corridor-code">{corridor.code}</span>
                          <span>{corridor.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {activeTab === "contact" ? (
                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Birincil iletişim</h2>
                    </div>
                    <button
                      type="button"
                      className="admin-btn-primary"
                      onClick={() => saveAll("İletişim bilgileri güncellendi.")}
                    >
                      Kaydet
                    </button>
                  </header>
                  <div className="admin-form-grid">
                    <label className="admin-field admin-field--span-2">
                      <span>Birincil e-posta</span>
                      <input
                        className="admin-input"
                        type="email"
                        value={profile.primaryEmail}
                        onChange={(event) =>
                          setProfile((c) => ({ ...c, primaryEmail: event.target.value }))
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Telefon</span>
                      <input
                        className="admin-input"
                        value={profile.phone}
                        onChange={(event) =>
                          setProfile((c) => ({ ...c, phone: event.target.value }))
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Web sitesi</span>
                      <input
                        className="admin-input"
                        value={profile.website}
                        onChange={(event) =>
                          setProfile((c) => ({ ...c, website: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                </section>
              ) : null}

              {activeTab === "audit" ? (
                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Denetim günlüğü</h2>
                      <p>Yerel operatör kayıtları</p>
                    </div>
                  </header>
                  <ul className="admin-audit-list admin-audit-list--premium">
                    {auditLog.length === 0 ? (
                      <li className="admin-audit-empty">Henüz kayıt yok.</li>
                    ) : (
                      auditLog.map((entry) => (
                        <li key={entry.id}>
                          <time dateTime={entry.at}>
                            {new Date(entry.at).toLocaleString("tr-TR")}
                          </time>
                          <span>{entry.summary}</span>
                          <span className="admin-audit-actor">{entry.actorEmail}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
