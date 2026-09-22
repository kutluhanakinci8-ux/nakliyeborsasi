"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "../../../../components/EmptyState";
import { FreightListingRow } from "../../../../components/FreightListingRow";
import { ModulePageShell } from "../../../../components/ModulePageShell";
import { useWebSession } from "../../../../context/WebSessionProvider";
import { AuctionApiClient } from "../../../../lib/AuctionApiClient";
import { MarketplaceApiClient } from "../../../../lib/MarketplaceApiClient";

type ListingRecord = {
  listingId: string;
  ownerCompanyId: string;
  origin: { cityName: string; countryCode: string };
  destination: { cityName: string; countryCode: string };
  weightTonnes: number;
  equipmentType: string;
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
    <ModulePageShell
      eyebrow="Hesap"
      title="İlanlarım"
      lead="Firmanıza ait yük ilanları — düzenleme ve yeni ilan marketplace üzerinden."
      action={
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
      }
      stats={[
        { value: String(myListings.length), label: "Aktif ilanınız" },
        { value: session?.companyId?.slice(0, 8) ?? "—", label: "Firma ref." },
      ]}
    >
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
    </ModulePageShell>
  );
}
