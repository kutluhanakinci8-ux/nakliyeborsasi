"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlatformAdminApiClient,
  formatParticipantType,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";
import { AdminBarChart, AdminDonutChart } from "./AdminDashboardCharts";

type AuctionRow = Awaited<
  ReturnType<typeof PlatformAdminApiClient.fetchAuctions>
>[number];

type ListingRow = Awaited<
  ReturnType<typeof PlatformAdminApiClient.fetchListings>
>[number];

type CompanyRow = Awaited<
  ReturnType<typeof PlatformAdminApiClient.fetchCompanies>
>[number];

type EnrichedAuction = AuctionRow & {
  ownerLegalName: string;
  participantTypeCode: string | null;
  laneLabel: string;
  listing: ListingRow | null;
};

type StatusFilter = "all" | "OPEN" | "CLOSED";

type TypeFilter = "all" | "LOAD_SHIPPER" | "LOAD_CARRIER" | "LOAD_SEEKER" | "other";

type BidFilter = "all" | "with_bids" | "no_bids";

function participantKey(code: string | null | undefined): TypeFilter {
  if (code === "LOAD_SHIPPER" || code === "LOAD_CARRIER" || code === "LOAD_SEEKER") {
    return code;
  }
  return "other";
}

function formatStatus(code: string): string {
  switch (code) {
    case "OPEN":
      return "Açık";
    case "CLOSED":
      return "Kapalı";
    default:
      return code;
  }
}

function formatEndsAt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isEndingSoon(iso: string): boolean {
  const ends = new Date(iso).getTime();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return ends > now && ends - now < day;
}

export function AdminAuctionsPageClient() {
  const { accessToken } = useWebSession();
  const [rows, setRows] = useState<EnrichedAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [bidFilter, setBidFilter] = useState<BidFilter>("all");
  const [selectedId, setSelectedId] = useState("");

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const [auctions, listings, companies] = await Promise.all([
        PlatformAdminApiClient.fetchAuctions(accessToken),
        PlatformAdminApiClient.fetchListings(accessToken),
        PlatformAdminApiClient.fetchCompanies(accessToken),
      ]);
      const listingMap = new Map(listings.map((l: ListingRow) => [l.id, l]));
      const companyMap = new Map(companies.map((c: CompanyRow) => [c.id, c]));

      const enriched: EnrichedAuction[] = auctions.map((auction) => {
        const listing = listingMap.get(auction.freightListingId) ?? null;
        const company = companyMap.get(auction.ownerCompanyId);
        const laneLabel = listing
          ? `${listing.originCityName} → ${listing.destinationCityName}`
          : `İlan ${auction.freightListingId.slice(0, 8)}…`;
        return {
          ...auction,
          ownerLegalName:
            listing?.ownerLegalName ??
            company?.legalName ??
            auction.ownerCompanyId.slice(0, 8),
          participantTypeCode: company?.participantTypeCode ?? null,
          laneLabel,
          listing,
        };
      });

      setRows(enriched);
      setSelectedId((current) => current || enriched[0]?.id || "");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(() => {
    let open = 0;
    let closed = 0;
    let totalBids = 0;
    let withBids = 0;
    let endingSoon = 0;
    const bidBuckets = { none: 0, few: 0, many: 0 };

    for (const row of rows) {
      if (row.statusCode === "OPEN") {
        open++;
        if (isEndingSoon(row.endsAt)) {
          endingSoon++;
        }
      } else if (row.statusCode === "CLOSED") {
        closed++;
      }
      totalBids += row.bidCount;
      if (row.bidCount > 0) {
        withBids++;
      }
      if (row.bidCount === 0) {
        bidBuckets.none++;
      } else if (row.bidCount <= 2) {
        bidBuckets.few++;
      } else {
        bidBuckets.many++;
      }
    }

    return {
      total: rows.length,
      open,
      closed,
      totalBids,
      withBids,
      endingSoon,
      bidBuckets,
    };
  }, [rows]);

  const donutSegments = useMemo(
    () =>
      [
        { label: "Açık", value: summary.open, color: "#0d9488" },
        { label: "Kapalı", value: summary.closed, color: "#64748b" },
      ].filter((s) => s.value > 0),
    [summary.open, summary.closed],
  );

  const q = filter.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (statusFilter !== "all" && row.statusCode !== statusFilter) {
      return false;
    }
    if (typeFilter !== "all" && participantKey(row.participantTypeCode) !== typeFilter) {
      return false;
    }
    if (bidFilter === "with_bids" && row.bidCount === 0) {
      return false;
    }
    if (bidFilter === "no_bids" && row.bidCount > 0) {
      return false;
    }
    if (!q) {
      return true;
    }
    return (
      row.laneLabel.toLowerCase().includes(q) ||
      row.ownerLegalName.toLowerCase().includes(q) ||
      row.id.toLowerCase().includes(q) ||
      row.freightListingId.toLowerCase().includes(q)
    );
  });

  const selected = rows.find((r) => r.id === selectedId) ?? filtered[0];

  const statusFilters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "Tümü" },
    { id: "OPEN", label: "Açık" },
    { id: "CLOSED", label: "Kapalı" },
  ];

  const bidFilters: { id: BidFilter; label: string }[] = [
    { id: "all", label: "Tüm teklifler" },
    { id: "with_bids", label: "Teklif var" },
    { id: "no_bids", label: "Teklif yok" },
  ];

  const typeFilters: { id: TypeFilter; label: string }[] = [
    { id: "all", label: "Tüm sahipler" },
    { id: "LOAD_SHIPPER", label: "Yük veren" },
    { id: "LOAD_CARRIER", label: "Taşıyan" },
    { id: "LOAD_SEEKER", label: "Arayan" },
    { id: "other", label: "Diğer" },
  ];

  return (
    <div className="platform-admin-command admin-auctions-premium">
      <header className="platform-admin-command-hero">
        <div>
          <p className="platform-admin-command-eyebrow">Teklif oturumları</p>
          <h1 className="platform-admin-command-title">İhaleler</h1>
          <p className="platform-admin-command-sub">
            Yük ilanlarına bağlı açık artırma kayıtları ve teklif hacmi
          </p>
        </div>
        <div className="platform-admin-command-hero-meta">
          <span className="admin-status-pill admin-status-pill--ok">
            {summary.open} açık ihale
          </span>
          <button type="button" className="admin-btn-ghost-light" onClick={() => void refresh()}>
            Yenile
          </button>
        </div>
      </header>

      <section className="admin-kpi-row admin-auctions-kpi-row" aria-label="İhale özet">
        <article className="admin-kpi-card admin-kpi-card--primary">
          <span className="admin-kpi-label">Açık</span>
          <p className="admin-kpi-value">{summary.open}</p>
          <span className="admin-kpi-hint">{summary.total} toplam oturum</span>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Kapalı</span>
          <p className="admin-kpi-value">{summary.closed}</p>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">Toplam teklif</span>
          <p className="admin-kpi-value">{summary.totalBids}</p>
          <span className="admin-kpi-hint">{summary.withBids} ihalede teklif</span>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">24 saat içinde biten</span>
          <p className="admin-kpi-value">{summary.endingSoon}</p>
        </article>
        <article className="admin-panel-card admin-org-donut-card">
          {donutSegments.length > 0 ? (
            <AdminDonutChart
              segments={donutSegments}
              centerLabel="Durum"
              centerValue={String(summary.open)}
            />
          ) : (
            <p className="platform-admin-empty">Veri yok</p>
          )}
        </article>
      </section>

      <section className="admin-panel-card admin-auctions-bid-chart">
        <header className="admin-panel-card-head">
          <div>
            <h2>Teklif yoğunluğu</h2>
            <p>İhale başına teklif sayısı grupları</p>
          </div>
        </header>
        <AdminBarChart
          items={[
            {
              label: "Teklif yok",
              value: summary.bidBuckets.none,
              displayValue: String(summary.bidBuckets.none),
              color: "#94a3b8",
            },
            {
              label: "1–2 teklif",
              value: summary.bidBuckets.few,
              displayValue: String(summary.bidBuckets.few),
              color: "#2563eb",
            },
            {
              label: "3+ teklif",
              value: summary.bidBuckets.many,
              displayValue: String(summary.bidBuckets.many),
              color: "#0d9488",
            },
          ]}
        />
      </section>

      <div className="admin-org-layout admin-org-layout--premium admin-auctions-layout">
        <aside className="admin-org-sidebar admin-panel-card">
          <header className="admin-org-sidebar-head">
            <h2>İhale dizini</h2>
            <p>{filtered.length} / {rows.length}</p>
          </header>
          <label className="admin-field">
            <span>Ara</span>
            <input
              className="admin-input"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Hat, firma, ID"
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
          <div className="admin-org-type-filters admin-auctions-bid-filters">
            {bidFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  bidFilter === item.id
                    ? "admin-org-type-chip active"
                    : "admin-org-type-chip"
                }
                onClick={() => setBidFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="admin-org-type-filters admin-auctions-type-filters">
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
                      <strong>{row.laneLabel}</strong>
                      <span
                        className={
                          row.statusCode === "OPEN"
                            ? "admin-org-badge admin-org-badge--ok"
                            : "admin-org-badge"
                        }
                      >
                        {formatStatus(row.statusCode)}
                      </span>
                    </span>
                    <span className="admin-auctions-list-owner">{row.ownerLegalName}</span>
                    <span className="admin-org-company-meta">
                      <span>{row.bidCount} teklif</span>
                      <span>
                        {row.minimumBidAmount} {row.currencyCode}
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
            <p className="platform-admin-empty">İhale seçin.</p>
          ) : (
            <>
              <header className="admin-org-detail-hero admin-panel-card">
                <div>
                  <h2>{selected.laneLabel}</h2>
                  <p className="admin-auctions-detail-owner">{selected.ownerLegalName}</p>
                  <div className="admin-org-detail-pills">
                    <span
                      className={
                        selected.statusCode === "OPEN"
                          ? "admin-org-badge admin-org-badge--ok"
                          : "admin-org-badge"
                      }
                    >
                      {formatStatus(selected.statusCode)}
                    </span>
                    <span className="admin-org-badge">
                      {selected.bidCount} teklif
                    </span>
                    <span className="admin-org-badge">
                      Min. {selected.minimumBidAmount} {selected.currencyCode}
                    </span>
                    <span className="admin-org-badge">
                      {formatParticipantType(selected.participantTypeCode)}
                    </span>
                    {selected.statusCode === "OPEN" && isEndingSoon(selected.endsAt) ? (
                      <span className="admin-org-badge admin-org-badge--warn">Yakında bitiyor</span>
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
                  <Link
                    href={`/admin/ilanlar?ilan=${selected.freightListingId}`}
                    className="admin-btn-secondary"
                  >
                    Bağlı ilan
                  </Link>
                  <Link href="/auctions" className="admin-btn-secondary" target="_blank" rel="noreferrer">
                    Üye ihale ekranı
                  </Link>
                </div>
              </header>

              <div className="admin-users-detail-grid admin-auctions-detail-grid">
                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Oturum</h2>
                      <p>İhale kaydı</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>İhale ID</dt>
                      <dd><code>{selected.id}</code></dd>
                    </div>
                    <div>
                      <dt>Durum</dt>
                      <dd>{formatStatus(selected.statusCode)}</dd>
                    </div>
                    <div>
                      <dt>Bitiş</dt>
                      <dd>{formatEndsAt(selected.endsAt)}</dd>
                    </div>
                    <div>
                      <dt>Sahip firma ID</dt>
                      <dd><code>{selected.ownerCompanyId}</code></dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Teklif kuralları</h2>
                      <p>Minimum ve para birimi</p>
                    </div>
                  </header>
                  <dl className="admin-users-dl">
                    <div>
                      <dt>Minimum teklif</dt>
                      <dd>{selected.minimumBidAmount}</dd>
                    </div>
                    <div>
                      <dt>Para birimi</dt>
                      <dd>{selected.currencyCode}</dd>
                    </div>
                    <div>
                      <dt>Toplam teklif</dt>
                      <dd>{selected.bidCount}</dd>
                    </div>
                  </dl>
                </section>

                <section className="admin-panel-card admin-users-detail-wide">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Bağlı yük ilanı</h2>
                      <p>Marketplace kaydı</p>
                    </div>
                  </header>
                  {selected.listing ? (
                    <dl className="admin-users-dl">
                      <div>
                        <dt>İlan ID</dt>
                        <dd><code>{selected.freightListingId}</code></dd>
                      </div>
                      <div>
                        <dt>Hat</dt>
                        <dd>{selected.laneLabel}</dd>
                      </div>
                      <div>
                        <dt>Yükleme</dt>
                        <dd>
                          {new Date(selected.listing.loadingDateStart).toLocaleDateString("tr-TR", {
                            dateStyle: "medium",
                          })}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="platform-admin-empty">
                      İlan bulunamadı — ID: <code>{selected.freightListingId}</code>
                    </p>
                  )}
                </section>

                <section className="admin-panel-card admin-users-detail-wide">
                  <header className="admin-panel-card-head">
                    <div>
                      <h2>Operatör notları</h2>
                      <p>Manuel kapatma ve teklif inceleme sonraki API sürümünde</p>
                    </div>
                  </header>
                  <ul className="admin-checklist admin-users-checklist">
                    <li>Açık ihaleler zamanlayıcı ile otomatik kapanır (API finalization)</li>
                    <li>Demo veri: API yeniden başlatıldığında seed grafiği oluşturur</li>
                    <li>Teklif detayları üye ihale ekranında görüntülenir</li>
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
