"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "../../../components/EmptyState";
import { FreightListingRow } from "../../../components/FreightListingRow";
import { MarketplaceSearchBar } from "../../../components/MarketplaceSearchBar";
import { MarketplaceStatsStrip } from "../../../components/MarketplaceStatsStrip";
import { useWebSession } from "../../../context/WebSessionProvider";
import { MarketplaceApiClient } from "../../../lib/MarketplaceApiClient";
import { AuctionApiClient } from "../../../lib/AuctionApiClient";

type ListingRecord = {
  listingId: string;
  ownerCompanyId: string;
  origin: { cityName: string; countryCode: string };
  destination: { cityName: string; countryCode: string };
  weightTonnes: number;
  equipmentType: string;
  price: { amount: number; currencyCode: string } | null;
};

function matchesQuery(city: string, country: string, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return (
    city.toLowerCase().includes(normalized) ||
    country.toLowerCase().includes(normalized)
  );
}

export function MarketplacePageClient() {
  const router = useRouter();
  const { accessToken, locale } = useWebSession();
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");

  async function loadListings(): Promise<void> {
    setIsBusy(true);
    setErrorMessage("");
    try {
      const payload = (await MarketplaceApiClient.fetchListings(
        accessToken,
        locale,
      )) as { listings: ListingRecord[] };
      setListings(payload.listings ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Yükleme hatası");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    void loadListings();
  }, [accessToken, locale]);

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      if (
        equipmentFilter &&
        listing.equipmentType.toUpperCase() !== equipmentFilter.toUpperCase()
      ) {
        return false;
      }
      if (!matchesQuery(listing.origin.cityName, listing.origin.countryCode, originQuery)) {
        return false;
      }
      if (
        !matchesQuery(
          listing.destination.cityName,
          listing.destination.countryCode,
          destinationQuery,
        )
      ) {
        return false;
      }
      return true;
    });
  }, [listings, originQuery, destinationQuery, equipmentFilter]);

  async function handleCreateAuction(listing: ListingRecord): Promise<void> {
    const minimumBidAmount = Number(
      window.prompt("Minimum teklif", String(listing.price?.amount ?? 2000)),
    );
    if (!minimumBidAmount) {
      return;
    }
    try {
      await AuctionApiClient.createSession(accessToken, locale, {
        freightListingId: listing.listingId,
        minimumBidAmount,
        currencyCode: listing.price?.currencyCode ?? "EUR",
        durationHours: 24,
      });
      router.push("/auctions");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "İhale hatası");
    }
  }

  return (
    <div className="exchange-page">
      <header className="exchange-hero">
        <div>
          <p className="exchange-eyebrow">Nakliye Borsası</p>
          <h1 className="exchange-title">Yük ve taşıma arama</h1>
          <p className="exchange-lead">
            Koridor genelinde yük ilanlarını filtreleyin, mesaj gönderin veya ihale
            başlatın.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary btn-secondary--light"
          onClick={() => void loadListings()}
          disabled={isBusy}
        >
          Yenile
        </button>
      </header>

      <MarketplaceStatsStrip
        listingCount={listings.length}
        corridorLabel="Aktif koridor"
      />

      <MarketplaceSearchBar
        originQuery={originQuery}
        destinationQuery={destinationQuery}
        equipmentFilter={equipmentFilter}
        onOriginChange={setOriginQuery}
        onDestinationChange={setDestinationQuery}
        onEquipmentChange={setEquipmentFilter}
        onSearch={() => void loadListings()}
        isBusy={isBusy}
        resultCount={filteredListings.length}
      />

      {errorMessage ? <p className="error banner error--light">{errorMessage}</p> : null}

      {isBusy && listings.length === 0 ? (
        <p className="loading-inline">İlanlar yükleniyor…</p>
      ) : null}

      {filteredListings.length === 0 && !isBusy ? (
        <EmptyState message="Aramanıza uygun ilan yok. Filtreleri temizleyin veya yenileyin." />
      ) : (
        <div className="freight-list">
          {filteredListings.map((listing) => (
            <FreightListingRow
              key={listing.listingId}
              listingId={listing.listingId}
              originCity={listing.origin.cityName}
              originCountry={listing.origin.countryCode}
              destinationCity={listing.destination.cityName}
              destinationCountry={listing.destination.countryCode}
              equipmentType={listing.equipmentType}
              weightTonnes={listing.weightTonnes}
              priceAmount={listing.price?.amount ?? null}
              priceCurrency={listing.price?.currencyCode ?? null}
              onMessage={() =>
                router.push(
                  `/messaging?companyId=${encodeURIComponent(listing.ownerCompanyId)}`,
                )
              }
              onTrust={() =>
                router.push(
                  `/trust?companyId=${encodeURIComponent(listing.ownerCompanyId)}`,
                )
              }
              onAuction={() => void handleCreateAuction(listing)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
