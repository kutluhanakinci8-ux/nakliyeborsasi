"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlatformAdminApiClient,
  formatParticipantType,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";
import { AdminBarChart, AdminDonutChart } from "./AdminDashboardCharts";

type ListingRow = Awaited<
  ReturnType<typeof PlatformAdminApiClient.fetchListings>
>[number];

type CompanyRow = Awaited<
  ReturnType<typeof PlatformAdminApiClient.fetchCompanies>
>[number];

type AuctionRow = Awaited<
  ReturnType<typeof PlatformAdminApiClient.fetchAuctions>
>[number];

type EnrichedListing = ListingRow & {
  participantTypeCode: string | null;
  auction: AuctionRow | null;
};

type TypeFilter = "all" | "LOAD_SHIPPER" | "LOAD_CARRIER" | "LOAD_SEEKER" | "other";

type PriceFilter = "all" | "priced" | "open";

type EquipmentFilter = "all" | string;

const EQUIPMENT_COLORS: Record<string, string> = {
  TAUTLINER: "#2563eb",
  REFRIGERATED: "#0d9488",
  FLATBED: "#d97706",
  TANKER: "#7c3aed",
};

function participantKey(code: string | null | undefined): TypeFilter {
  if (code === "LOAD_SHIPPER" || code === "LOAD_CARRIER" || code === "LOAD_SEEKER") {
    return code;
  }
  return "other";
}

function formatEquipment(code: string): string {
  switch (code) {
    case "TAUTLINER":
      return "Tenteli";
    case "REFRIGERATED":
      return "Frigorifik";
    case "FLATBED":
      return "Açık kasa";
    case "TANKER":
      return "Tanker";
    default:
      return code;
  }
}

function formatLane(row: ListingRow): string {
  return `${row.originCityName} → ${row.destinationCityName}`;
}

function formatPrice(row: ListingRow): string {
  if (!row.priceAmount) {
    return "Açık fiyat";
  }
  return `${row.priceAmount} ${row.priceCurrencyCode ?? ""}`.trim();
}

function formatLoadingDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("tr-TR", { dateStyle: "medium" });
}

export function AdminListingsPageClient() {
  const searchParams = useSearchParams();
  const ilanFromQuery = searchParams.get("ilan");
  const { accessToken } = useWebSession();
  const [rows, setRows] = useState<EnrichedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>("all");
  const [selectedId, setSelectedId] = useState("");

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const [listings, companies, auctions] = await Promise.all([
        PlatformAdminApiClient.fetchListings(accessToken),
        PlatformAdminApiClient.fetchCompanies(accessToken),
        PlatformAdminApiClient.fetchAuctions(accessToken),
      ]);
      const companyMap = new Map(companies.map((c: CompanyRow) => [c.id, c]));
      const auctionByListing = new Map(
        auctions.map((a: AuctionRow) => [a.freightListingId, a]),
      );
      const enriched: EnrichedListing[] = listings.map((listing) => ({
        ...listing,
        participantTypeCode:
          companyMap.get(listing.ownerCompanyId)?.participantTypeCode ?? null,
        auction: auctionByListing.get(listing.id) ?? null,
      }));
      setRows(enriched);
      setSelectedId((current) => current || enriched[0]?.id || "");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (ilanFromQuery) {
      setSelectedId(ilanFromQuery);
    }
  }, [ilanFromQuery]);

  const summary = useMemo(() => {
    const byEquipment = new Map<string, number>();
    const byParticipant = { loadShipper: 0, loadCarrier: 0, loadSeeker: 0, other: 0 };
    let priced = 0;
    let openPrice = 0;
    let withAuction = 0;
    const owners = new Set<string>();

    for (const row of rows) {
      owners.add(row.ownerCompanyId);
      byEquipment.set(
        row.equipmentTypeCode,
        (byEquipment.get(row.equipmentTypeCode) ?? 0) + 1,
      );
      if (row.priceAmount) {
        priced++;
      } else {
        openPrice++;
      }
      if (row.auction) {
        withAuction++;
      }
      switch (participantKey(row.participantTypeCode)) {
        case "LOAD_SHIPPER":
          byParticipant.loadShipper++;
          break;
        case "LOAD_CARRIER":
          byParticipant.loadCarrier++;
          break;
        case "LOAD_SEEKER":
          byParticipant.loadSeeker++;
          break;
        default:
          byParticipant.other++;
      }
    }

    return {
      total: rows.length,
      priced,
      openPrice,
      withAuction,
      uniqueOwners: owners.size,
      byEquipment,
      byParticipant,
    };
  }, [rows]);

  const donutSegments = useMemo(() => {
    const segments: { label: string; value: number; color: string }[] = [];
    for (const [code, count] of summary.byEquipment) {
      if (count <= 0) {
        continue;
      }
      segments.push({
        label: formatEquipment(code),
        value: count,
        color: EQUIPMENT_COLORS[code] ?? "#64748b",
      });
    }
    return segments.sort((a, b) => b.value - a.value);
  }, [summary.byEquipment]);

  const equipmentOptions = useMemo(
    () => [...new Set(rows.map((r) => r.equipmentTypeCode))].sort(),
    [rows],
  );

  const q = filter.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (equipmentFilter !== "all" && row.equipmentTypeCode !== equipmentFilter) {
      return false;
    }
    if (typeFilter !== "all" && participantKey(row.participantTypeCode) !== typeFilter) {
      return false;
    }
    if (priceFilter === "priced" && !row.priceAmount) {
      return false;
    }
    if (priceFilter === "open" && row.priceAmount) {
      return false;
    }
    if (!q) {
      return true;
    }
    return (
      formatLane(row).toLowerCase().includes(q) ||
      row.ownerLegalName.toLowerCase().includes(q) ||
      row.originCityName.toLowerCase().includes(q) ||
      row.destinationCityName.toLowerCase().includes(q) ||
      row.id.toLowerCase().includes(q)
    );
  });

  const selected = rows.find((r) => r.id === selectedId) ?? filtered[0];

  const typeFilters: { id: TypeFilter; label: string }[] = [
    { id: "all", label: "Tüm sahipler" },
    { id: "LOAD_SHIPPER", label: "Yük veren" },
    { id: "LOAD_CARRIER", label: "Taşıyan" },
    { id: "LOAD_SEEKER", label: "Arayan" },
    { id: "other", label: "Diğer" },
  ];

  const priceFilters: { id: PriceFilter; label: string }[] = [
    { id: "all", label: "Tüm fiyatlar" },
    { id: "priced", label: "Fiyatlı" },
    { id: "open", label: "Açık fiyat" },
  ];

  return (
    <div className="platform-admin-command admin-listings-premium">
      <header className="platform-admin-command-hero">
        <div>
          <p className="platform-admin-command-eyebrow">Pazar operasyonları</p>
          <h1 className="platform-admin-command-title">Yük ilanları</h1>
          <p className="platform-admin-command-sub">
            Marketplace veritabanındaki tüm yük kayıtları
          </p>
        </div>
        <div className="platform-admin-command-hero-meta">
          <span className="admin-status-pill admin-status-pill--ok">
            {summary.total} ilan
          </span>
          <button type="button" className="admin-btn-ghost-light" onClick={() => void refresh()}>
            Yenile
          </button>
        </div>
      </header>

      <section className="admin-kpi-row admin-listings-kpi-row" aria-label="İlan özet">
        <article className="admin-kpi-card admin-kpi-card--primary">
          <span className="admin-kpi-label">Toplam ilan</span>
          <p className="admin-kpi-value">{summary.total}</p>
          <span className="admin-kpi-hint">{summary.uniqueOwners} firma</span>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Fiyatlı</span>
          <p className="admin-kpi-value">{summary.priced}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Açık fiyat</span>
          <p className="admin-kpi-value">{summary.openPrice}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">İhale bağlı</span>
          <p className="admin-kpi-value">{summary.withAuction}</p>
        </article>
        <article className="admin-panel-card admin-org-donut-card">
          {donutSegments.length > 0 ? (
            <AdminDonutChart
              segments={donutSegments}
              centerLabel="Ekipman"
              centerValue={String(summary.total)}
            />
          ) : (
            <p className="platform-admin-empty">Veri yok</p>
          )}
        </article>
      </section>

      <section className="admin-panel-card admin-listings-owner-chart">
        <header className="admin-panel-card-head">
          <div>
            <h2>Sahip firmalar (pazar rolü)</h2>
            <p>İlan sayısı, firma participant tipine göre</p>
          </div>
        </header>
        <AdminBarChart
          items={[
            {
              label: "Yük veren",
              value: summary.byParticipant.loadShipper,
              displayValue: String(summary.byParticipant.loadShipper),
              color: "#0d9488",
            },
            {
              label: "Taşıyan",
              value: summary.byParticipant.loadCarrier,
              displayValue: String(summary.byParticipant.loadCarrier),
              color: "#2563eb",
            },
            {
              label: "Arayan",
              value: summary.byParticipant.loadSeeker,
              displayValue: String(summary.byParticipant.loadSeeker),
              color: "#d97706",
            },
            {
              label: "Diğer",
              value: summary.byParticipant.other,
              displayValue: String(summary.byParticipant.other),
              color: "#94a3b8",
            },
          ]}
        />
      </section>

      <div className="admin-org-layout admin-org-layout--premium admin-listings-layout">
        <aside className="admin-org-sidebar admin-panel-card">
          <header className="admin-org-sidebar-head">
            <h2>İlan dizini</h2>
            <p>{filtered.length} / {rows.length}</p>
          </header>
          <label className="admin-field">
            <span>Ara</span>
            <input
              className="admin-input"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Hat, şehir, firma"
            />
          </label>
          <div className="admin-org-type-filters" role="tablist" aria-label="Fiyat">
            {priceFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  priceFilter === item.id
                    ? "admin-org-type-chip active"
                    : "admin-org-type-chip"
                }
                onClick={() => setPriceFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="admin-org-type-filters admin-listings-equipment-filters">
            <button
              type="button"
              className={
                equipmentFilter === "all"
                  ? "admin-org-type-chip active"
                  : "admin-org-type-chip"
              }
              onClick={() => setEquipmentFilter("all")}
            >
              Tüm ekipman
            </button>
            {equipmentOptions.map((code) => (
              <button
                key={code}
                type="button"
                className={
                  equipmentFilter === code
                    ? "admin-org-type-chip active"
                    : "admin-org-type-chip"
                }
                onClick={() => setEquipmentFilter(code)}
              >
                {formatEquipment(code)}
              </button>
            ))}
          </div>
          <div className="admin-org-type-filters admin-listings-type-filters">
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
                      <strong>{formatLane(row)}</strong>
                      {row.auction ? (
                        <span className="admin-org-badge admin-org-badge--ok">İhale</span>
                      ) : null}
                    </span>
                    <span className="admin-listings-list-owner">{row.ownerLegalName}</span>
                    <span className="admin-org-company-meta">
                      <span className="admin-org-badge">{formatEquipment(row.equipmentTypeCode)}</span>
                      <span>{formatPrice(row)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="admin-org-main">
          {!selected ? (
            <p className="platform-admin-empty">İlan seçin.</p>
          ) : (
            <>
              <header className="admin-org-detail-hero admin-panel-card">
                <div>
                  <h2>{formatLane(selected)}</h2>
                  <p className="admin-listings-detail-owner">{selected.ownerLegalName}</p>
                  <div className="admin-org-detail-pills">
                    <span className="admin-org-badge">{formatEquipment(selected.equipmentTypeCode)}</span>
                    <span className="admin-org-badge admin-org-badge--ok">
                      {formatPrice(selected)}
                    </span>
                    <span className="admin-org-badge">
                      {formatParticipantType(selected.participantTypeCode)}
                    </span>
                    {selected.auction ? (
                      <span className="admin-org-badge admin-org-badge--ok">
                        İhale: {selected.auction.statusCode}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="admin-org-detail-stats admin-users-detail-actions">
                  <Link
                    href={`/admin/organizasyon?firma=${selected.ownerCompanyId}`}
                    className="admin-btn-primary"
                  >
                    Sahip firmayı yönet
                  </Link>
                  <Link href="/marketplace" className="admin-btn-secondary" target="_blank" rel="noreferrer">
                    Üye marketplace
                  </Link>
                  {selected.auction ? (
                    <Link href="/admin/ihaleler" className="admin-btn-secondary">
                      İhaleler modülü
                    </Link>
                  ) : null}
                </div>
              </header>

              <div className="admin-users-detail-grid admin-listings-detail-grid">
                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Hat ve zaman</h2>
                      <p>Yükleme ve güzergâh</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>Çıkış</dt>
                      <dd>{selected.originCityName}</dd>
                    </div>
                    <div>
                      <dt>Varış</dt>
                      <dd>{selected.destinationCityName}</dd>
                    </div>
                    <div>
                      <dt>Yükleme tarihi</dt>
                      <dd>{formatLoadingDate(selected.loadingDateStart)}</dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Fiyat ve ekipman</h2>
                      <p>Pazar alanları</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>Ekipman kodu</dt>
                      <dd>{formatEquipment(selected.equipmentTypeCode)}</dd>
                    </div>
                    <div>
                      <dt>Tutar</dt>
                      <dd>{selected.priceAmount ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Para birimi</dt>
                      <dd>{selected.priceCurrencyCode ?? "—"}</dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Sahip firma</h2>
                      <p>Organizasyon bağlantısı</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>Firma</dt>
                      <dd>{selected.ownerLegalName}</dd>
                    </div>
                    <div>
                      <dt>Firma ID</dt>
                      <dd><code>{selected.ownerCompanyId}</code></dd>
                    </div>
                    <div>
                      <dt>İlan ID</dt>
                      <dd><code>{selected.id}</code></dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>İhale durumu</h2>
                      <p>Bağlı açık artırma</p>
                    </div>
                  </header>
                  {selected.auction ? (
                    <dl className="admin-users-dl">
                      <div>
                        <dt>İhale ID</dt>
                        <dd><code>{selected.auction.id}</code></dd>
                      </div>
                      <div>
                        <dt>Durum</dt>
                        <dd>{selected.auction.statusCode}</dd>
                      </div>
                      <div>
                        <dt>Minimum teklif</dt>
                        <dd>
                          {selected.auction.minimumBidAmount} {selected.auction.currencyCode}
                        </dd>
                      </div>
                      <div>
                        <dt>Teklif sayısı</dt>
                        <dd>{selected.auction.bidCount}</dd>
                      </div>
                      <div>
                        <dt>Bitiş</dt>
                        <dd>
                          {new Date(selected.auction.endsAt).toLocaleString("tr-TR", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="platform-admin-empty">Bu ilana bağlı ihale kaydı yok.</p>
                  )}
                </section>

                <section className="admin-panel-card admin-users-detail-wide">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Operatör notları</h2>
                      <p>Moderasyon ve düzenleme sonraki API sürümünde</p>
                    </div>
                  </header>
                  <ul className="admin-checklist admin-users-checklist">
                    <li>İlanlar üye panelinde oluşturulur; burada salt okunur dizin</li>
                    <li>Test ilanları: yük veren test firmaları (seed)</li>
                    <li>İhale oluşturma: üye ihale akışı veya admin ihale modülü</li>
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
