"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "../../../../components/EmptyState";
import { FreightListingRow } from "../../../../components/FreightListingRow";
import { useWebSession } from "../../../../context/WebSessionProvider";
import { AuctionApiClient } from "../../../../lib/AuctionApiClient";
import { MarketplaceApiClient } from "../../../../lib/MarketplaceApiClient";

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

export function MyListingsPageClient() {
  const router = useRouter();
  const { accessToken, locale, session } = useWebSession();
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

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

  const myListings = useMemo(() => {
    if (!session?.companyId) {
      return [];
    }
    return listings.filter(
      (listing) => listing.ownerCompanyId === session.companyId,
    );
  }, [listings, session?.companyId]);

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
    <>
      <div className="account-page-toolbar">
        <div className="account-page-actions">
          <button
            type="button"
            className="btn-secondary btn-secondary--light"
            onClick={() => void loadListings()}
            disabled={isBusy}
          >
            Yenile
          </button>
          <Link href="/marketplace" className="btn-primary">
            Yeni ilan / arama
          </Link>
        </div>
      </div>
      <div className="stats-strip">
        <div className="stat-item">
          <span className="stat-item-value">{String(myListings.length)}</span>
          <span className="stat-item-label">Aktif ilanınız</span>
        </div>
        <div className="stat-item">
          <span className="stat-item-value">
            {session?.companyId?.slice(0, 8) ?? "—"}
          </span>
          <span className="stat-item-label">Firma ref.</span>
        </div>
      </div>
      {errorMessage ? <p className="error banner error--light">{errorMessage}</p> : null}

      {isBusy && myListings.length === 0 ? (
        <p className="loading-inline">İlanlar yükleniyor…</p>
      ) : null}

      {myListings.length === 0 && !isBusy ? (
        <EmptyState
          message="Henüz size ait ilan görünmüyor. Marketplace’te ilan oluşturun veya demo verisini kontrol edin."
        />
      ) : (
        <div className="freight-list">
          {myListings.map((listing) => (
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
            />
          ))}
        </div>
      )}
    </>
  );
}
