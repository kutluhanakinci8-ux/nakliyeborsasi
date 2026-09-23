"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWebSession } from "../../../../context/WebSessionProvider";
import {
  FleetApiClient,
  type DriverPortalSnapshot,
} from "../../../../lib/FleetApiClient";

export function DriverPortalPageClient() {
  const { accessToken, locale } = useWebSession();
  const [portal, setPortal] = useState<DriverPortalSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadPortal = useCallback(async (): Promise<void> => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const snapshot = await FleetApiClient.fetchDriverPortal(accessToken, locale);
      setPortal(snapshot);
    } catch {
      setPortal(null);
      setErrorMessage(
        "Bu hesap bir şoför kaydına bağlı değil. Firma yöneticisi Filo ekranından e-postanızı şoför kaydına bağlamalı.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, locale]);

  useEffect(() => {
    void loadPortal();
  }, [loadPortal]);

  if (loading) {
    return <p className="loading-inline">Şoför paneli yükleniyor…</p>;
  }

  if (!portal) {
    return (
      <div className="account-card module-panel">
        <p className="error banner error--light">{errorMessage}</p>
        <p className="account-card-lead">
          <Link href="/hesap/filo">Filo yönetimi</Link> (taşıyıcı hesapları için).
        </p>
      </div>
    );
  }

  return (
    <div className="fleet-page-grid">
      <section className="account-card module-panel">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">{portal.driver.displayName}</h2>
            <p className="account-card-lead">
              {portal.company?.legalName ?? "Firma"} · {portal.driver.statusCode}
            </p>
          </div>
        </header>
        {portal.activeVehicle ? (
          <p className="account-meta-line">
            Aktif araç: <strong>{portal.activeVehicle.licensePlateDisplay}</strong> (
            {portal.activeVehicle.equipmentTypeCode})
          </p>
        ) : (
          <p className="account-meta-line">Henüz atanmış araç yok.</p>
        )}
      </section>

      <section className="account-card module-panel">
        <h2 className="account-card-title">Atanan ilanlar</h2>
        <ul className="fleet-entity-list">
          {portal.assignedListings.length === 0 ? (
            <li className="fleet-entity-meta">İlan ataması yok.</li>
          ) : (
            portal.assignedListings.map((listing) => (
              <li key={listing.listingId} className="fleet-entity-row">
                <strong>
                  {listing.originCityName} → {listing.destinationCityName}
                </strong>
                <span className="fleet-entity-meta">
                  {listing.listingKindCode} · Yükleme {listing.loadingDateStart}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="account-card module-panel fleet-page-grid-span">
        <h2 className="account-card-title">Atanan ihaleler</h2>
        <ul className="fleet-entity-list">
          {portal.assignedAuctions.length === 0 ? (
            <li className="fleet-entity-meta">İhale ataması yok.</li>
          ) : (
            portal.assignedAuctions.map((auction) => (
              <li key={auction.sessionId} className="fleet-entity-row">
                <strong>
                  İhale · {auction.statusCode}
                </strong>
                <span className="fleet-entity-meta">
                  Bitiş {new Date(auction.endsAt).toLocaleString("tr-TR")}
                </span>
                <Link href={`/auctions/${auction.sessionId}`}>Detay</Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
