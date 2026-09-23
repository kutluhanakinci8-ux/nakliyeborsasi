"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FleetLiveMapCanvas } from "../../../../../components/fleet/FleetLiveMapCanvas";
import { useWebSession } from "../../../../../context/WebSessionProvider";
import {
  TelemetryApiClient,
  type FleetDriverRouteSnapshot,
  type FleetLiveDriverPin,
  type FleetLiveMapSnapshot,
  type FleetMotionPhase,
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

function motionLabel(phase: FleetMotionPhase): string {
  switch (phase) {
    case "STOPPED":
      return "Duruyor";
    case "MOVING":
      return "Hareket halinde";
    case "ACCELERATING":
      return "Hızlanıyor";
    case "DECELERATING":
      return "Yavaşlıyor";
    default:
      return "Bilinmiyor";
  }
}

export function FleetLiveMapPageClient() {
  const { accessToken, locale } = useWebSession();
  const [snapshot, setSnapshot] = useState<FleetLiveMapSnapshot | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] =
    useState<FleetDriverRouteSnapshot | null>(null);
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
      setErrorMessage(
        "Canlı harita verisi alınamadı. Filo modülü ve giriş hesabını kontrol edin.",
      );
    }
  }, [accessToken, locale]);

  const loadRoute = useCallback(
    async (driverId: string) => {
      if (!accessToken) {
        return;
      }
      try {
        const route = await TelemetryApiClient.fetchCarrierDriverRoute(
          accessToken,
          locale,
          driverId,
          6,
          "matched",
        );
        setSelectedRoute(route);
      } catch {
        setSelectedRoute(null);
      }
    },
    [accessToken, locale],
  );

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 20000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!selectedDriverId) {
      setSelectedRoute(null);
      return;
    }
    void loadRoute(selectedDriverId);
    const timer = window.setInterval(() => {
      void loadRoute(selectedDriverId);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [loadRoute, selectedDriverId]);

  const drivers = snapshot?.drivers ?? [];
  const liveCount = drivers.filter((driver) => driver.trackingState === "LIVE").length;
  const selectedDriver =
    drivers.find((driver) => driver.driverId === selectedDriverId) ?? null;

  return (
    <div className="fleet-live-map-page">
      <header className="account-card module-panel fleet-page-grid-span">
        <div className="account-card-head">
          <div>
            <h1 className="account-card-title">Canlı filo haritası</h1>
            <p className="account-card-lead">
              Konum, rota, hız ve hızlanma/yavaşlama (son 6 saat).{" "}
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
            selectedRoute={selectedRoute}
            onSelectDriver={setSelectedDriverId}
          />
        </section>
        <aside className="account-card module-panel fleet-live-map-sidebar">
          <h2 className="account-card-title">Şoförler</h2>
          {selectedDriver ? (
            <div className="fleet-live-map-detail">
              <p className="fleet-entity-meta">
                <strong>{selectedDriver.displayName}</strong> ·{" "}
                {motionLabel(selectedDriver.motionPhase)}
                {selectedDriver.speedDeltaKmh !== null
                  ? ` (${selectedDriver.speedDeltaKmh > 0 ? "+" : ""}${selectedDriver.speedDeltaKmh} km/s)`
                  : ""}
              </p>
              {selectedRoute ? (
                <p className="fleet-entity-meta">
                  Rota noktası: {selectedRoute.routePoints.length}
                  {selectedRoute.distanceKm !== null
                    ? ` · ${selectedRoute.distanceKm} km (yol)`
                    : ""}
                  · Güvenlik olayı: {selectedRoute.safetyMarkers.length}
                  {selectedRoute.roadGeometryStatus === "PENDING"
                    ? " · Yol hesaplanıyor…"
                    : ""}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="fleet-entity-meta">Rota için bir şoför seçin.</p>
          )}
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
                      {stateLabel(driver.trackingState)} ·{" "}
                      {motionLabel(driver.motionPhase)}
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
