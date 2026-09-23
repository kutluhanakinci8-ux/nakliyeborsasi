"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FleetLiveMapCanvas } from "../../../../../components/fleet/FleetLiveMapCanvas";
import { useWebSession } from "../../../../../context/WebSessionProvider";
import {
  TelemetryApiClient,
  type FleetLiveDriverPin,
  type FleetLiveMapSnapshot,
} from "../../../../../lib/TelemetryApiClient";

function stateLabel(state: FleetLiveDriverPin["trackingState"]): string {
  switch (state) {
    case "LIVE":
      return "Canlı";
    case "STALE":
      return "Gecikmeli";
    case "OFFLINE":
      return "Çevrimdışı";
    case "NO_SIGNAL":
      return "Sinyal yok";
  }
}

export function FleetLiveMapPageClient() {
  const { accessToken, locale } = useWebSession();
  const [snapshot, setSnapshot] = useState<FleetLiveMapSnapshot | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    try {
      const liveMap = await TelemetryApiClient.fetchCarrierLiveMap(
        accessToken,
        locale,
      );
      setSnapshot(liveMap);
      setErrorMessage("");
    } catch {
      setErrorMessage("Canlı harita verisi alınamadı. Filo modülü ve giriş hesabını kontrol edin.");
    }
  }, [accessToken, locale]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 20000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const drivers = snapshot?.drivers ?? [];
  const liveCount = drivers.filter((driver) => driver.trackingState === "LIVE").length;

  return (
    <div className="fleet-live-map-page">
      <header className="account-card module-panel fleet-page-grid-span">
        <div className="account-card-head">
          <div>
            <h1 className="account-card-title">Canlı filo haritası</h1>
            <p className="account-card-lead">
              Şoför telefonundan gelen son konumlar (20 sn yenilenir).{" "}
              <Link href="/hesap/filo">← Filo yönetimi</Link>
            </p>
          </div>
          <button
            type="button"
            className="btn-account-primary"
            onClick={() => void refresh()}
          >
            Yenile
          </button>
        </div>
        {errorMessage ? (
          <p className="error banner error--light">{errorMessage}</p>
        ) : null}
        <p className="account-meta-line">
          <strong>{liveCount}</strong> canlı · <strong>{drivers.length}</strong> şoför
          {snapshot?.updatedAt
            ? ` · Güncelleme: ${new Date(snapshot.updatedAt).toLocaleTimeString("tr-TR")}`
            : null}
        </p>
      </header>

      <div className="fleet-live-map-layout fleet-page-grid-span">
        <section className="account-card module-panel fleet-live-map-panel">
          <FleetLiveMapCanvas
            drivers={drivers}
            selectedDriverId={selectedDriverId}
            onSelectDriver={setSelectedDriverId}
          />
        </section>
        <aside className="account-card module-panel fleet-live-map-sidebar">
          <h2 className="account-card-title">Şoförler</h2>
          <ul className="fleet-live-driver-list">
            {drivers.map((driver) => (
              <li key={driver.driverId}>
                <button
                  type="button"
                  className={
                    selectedDriverId === driver.driverId
                      ? "fleet-live-driver-item fleet-live-driver-item--active"
                      : "fleet-live-driver-item"
                  }
                  onClick={() => setSelectedDriverId(driver.driverId)}
                >
                  <span
                    className={`fleet-live-driver-dot fleet-live-driver-dot--${driver.trackingState.toLowerCase()}`}
                    aria-hidden
                  />
                  <div>
                    <strong>{driver.displayName}</strong>
                    <span className="fleet-entity-meta">
                      {stateLabel(driver.trackingState)}
                      {driver.licensePlateDisplay
                        ? ` · ${driver.licensePlateDisplay}`
                        : ""}
                      {driver.lastSpeedKmh !== null
                        ? ` · ${Math.round(driver.lastSpeedKmh)} km/s`
                        : ""}
                    </span>
                    {driver.lastSeenAt ? (
                      <span className="fleet-entity-meta">
                        Son sinyal:{" "}
                        {new Date(driver.lastSeenAt).toLocaleString("tr-TR")}
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
