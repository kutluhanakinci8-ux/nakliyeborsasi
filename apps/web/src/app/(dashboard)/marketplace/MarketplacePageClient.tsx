"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "../../../components/EmptyState";
import { FreightListingRow } from "../../../components/FreightListingRow";
import { MarketplaceSearchBar } from "../../../components/MarketplaceSearchBar";
import { useWebSession } from "../../../context/WebSessionProvider";
import { MarketplaceApiClient } from "../../../lib/MarketplaceApiClient";
import { AuctionCounterOfferDialog } from "../../../components/AuctionCounterOfferDialog";
import { AuctionApiClient } from "../../../lib/AuctionApiClient";

type RoutePointRecord = {
  cityName: string;
  countryCode: string;
  placeName?: string | null;
  placeKindCode?: string | null;
};

type ListingRecord = {
  listingId: string;
  ownerCompanyId: string;
  origin: RoutePointRecord;
  destination: RoutePointRecord;
  weightTonnes: number;
  equipmentType: string;
  loadingDateStart: string;
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
  const [offerListing, setOfferListing] = useState<ListingRecord | null>(null);
  const [offerError, setOfferError] = useState("");
  const [offerBusy, setOfferBusy] = useState(false);

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

  async function handleFixedAccept(listing: ListingRecord): Promise<void> {
    if (!listing.price) {
      return;
    }
    try {
      const result = await AuctionApiClient.acceptFixedListingPrice(
        accessToken,
        locale,
        listing.listingId,
      );
      router.push(`/auctions/${result.sessionId}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sabit kabul hatası");
    }
  }

  async function submitPriceOffer(payload: {
    amount: number;
    currencyCode: string;
    note: string;
  }): Promise<void> {
    if (!offerListing) {
      return;
    }
    setOfferBusy(true);
    setOfferError("");
    try {
      const result = await AuctionApiClient.sendListingPriceOffer(
        accessToken,
        locale,
        offerListing.listingId,
        {
          offerAmount: payload.amount,
          currencyCode: payload.currencyCode,
          note: payload.note || undefined,
        },
      );
      setOfferListing(null);
      router.push(`/messaging?threadId=${encodeURIComponent(result.threadId)}`);
    } catch (error) {
      setOfferError(error instanceof Error ? error.message : "Öneri hatası");
    } finally {
      setOfferBusy(false);
    }
  }

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
      <header className="exchange-hero exchange-hero--marketplace">
        <div className="exchange-hero-head">
          <div className="exchange-hero-intro">
            <p className="exchange-eyebrow">Nakliye Borsası</p>
            <h1 className="exchange-title">Yük ve taşıma arama</h1>
          </div>
          <div className="exchange-hero-head-actions">
            <span className="exchange-corridor-pill" title="Platform koridoru">
              TR · UA · EU
            </span>
            <button
              type="button"
              className="btn-secondary btn-secondary--light exchange-hero-refresh"
              onClick={() => void loadListings()}
              disabled={isBusy}
            >
              Yenile
            </button>
          </div>
        </div>

        <MarketplaceSearchBar
          variant="embedded"
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

        <p className="search-meta search-meta--hero">
          <span className="search-meta-count">{filteredListings.length}</span>
          ilan listeleniyor
          {isBusy ? <span className="search-meta-busy"> · güncelleniyor…</span> : null}
        </p>
      </header>

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
              origin={listing.origin}
              destination={listing.destination}
              equipmentType={listing.equipmentType}
              weightTonnes={listing.weightTonnes}
              loadingDateStart={listing.loadingDateStart}
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
              onPriceOffer={() => {
                setOfferError("");
                setOfferListing(listing);
              }}
              onFixedAccept={() => void handleFixedAccept(listing)}
            />
          ))}
        </div>
      )}

      <AuctionCounterOfferDialog
        open={offerListing !== null}
        listingLabel={
          offerListing
            ? `${offerListing.origin.cityName} → ${offerListing.destination.cityName}`
            : ""
        }
        defaultAmount={offerListing?.price?.amount ?? null}
        defaultCurrency={offerListing?.price?.currencyCode ?? "EUR"}
        isSubmitting={offerBusy}
        errorMessage={offerError}
        onClose={() => setOfferListing(null)}
        onSubmit={(payload) => void submitPriceOffer(payload)}
      />
    </div>
  );
}
