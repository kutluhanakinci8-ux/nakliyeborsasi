"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "../../../components/EmptyState";
import { PageHeader } from "../../../components/PageHeader";
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

export function MarketplacePageClient() {
  const router = useRouter();
  const { accessToken, locale } = useWebSession();
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
      <PageHeader
        title="Marketplace"
        description="Platform yük ilanları — TR ve UA–EU koridoru"
        action={
          <button type="button" className="btn-secondary" onClick={() => void loadListings()} disabled={isBusy}>
            Yenile
          </button>
        }
      />
      {errorMessage ? <p className="error banner">{errorMessage}</p> : null}
      {listings.length === 0 && !isBusy ? (
        <EmptyState message="Henüz ilan yok veya yüklenemedi." />
      ) : (
        <div className="listing-grid">
          {listings.map((listing) => (
            <article key={listing.listingId} className="listing-card">
              <h2>
                {listing.origin.cityName} ({listing.origin.countryCode}) →{" "}
                {listing.destination.cityName} ({listing.destination.countryCode})
              </h2>
              <p className="muted">
                {listing.equipmentType} · {listing.weightTonnes} t
                {listing.price
                  ? ` · ${listing.price.amount} ${listing.price.currencyCode}`
                  : ""}
              </p>
              <div className="card-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    router.push(
                      `/messaging?companyId=${encodeURIComponent(listing.ownerCompanyId)}`,
                    )
                  }
                >
                  Mesaj
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    router.push(
                      `/trust?companyId=${encodeURIComponent(listing.ownerCompanyId)}`,
                    )
                  }
                >
                  Güven
                </button>
                <button type="button" className="btn-primary" onClick={() => void handleCreateAuction(listing)}>
                  İhale aç
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
