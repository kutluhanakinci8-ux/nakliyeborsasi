"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const FleetLiveMapCanvas = dynamic(
  () =>
    import("../../../../../components/fleet/FleetLiveMapCanvas").then(
      (mod) => mod.FleetLiveMapCanvas,
    ),
  { ssr: false, loading: () => <div className="fleet-live-map-canvas" /> },
);
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

function formatOptionalMeters(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${Math.round(value)} m`;
}

function formatCoordinate(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(6);
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
  const [showWeighStations, setShowWeighStations] = useState(true);
  const [showTruckParking, setShowTruckParking] = useState(true);
  const [routeError, setRouteError] = useState("");

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

  useEffect(() => {
    if (!snapshot || selectedDriverId) {
      return;
    }
    const firstLive = snapshot.drivers.find(
      (driver) => driver.trackingState === "LIVE",
    );
    if (firstLive) {
      setSelectedDriverId(firstLive.driverId);
    }
  }, [snapshot, selectedDriverId]);

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
          "road",
        );
        setSelectedRoute(route);
        setRouteError("");
      } catch {
        setSelectedRoute(null);
        setRouteError("Rota ve telemetri akışı yüklenemedi.");
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
            showWeighStations={showWeighStations}
            showTruckParking={showTruckParking}
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
              <dl className="fleet-telemetry-kv">
                <div className="fleet-telemetry-kv-span">
                  <dt>Enlem (lat)</dt>
                  <dd>{formatCoordinate(selectedDriver.latitude)}</dd>
                </div>
                <div className="fleet-telemetry-kv-span">
                  <dt>Boylam (lng)</dt>
                  <dd>{formatCoordinate(selectedDriver.longitude)}</dd>
                </div>
                {selectedDriver.snappedLatitude !== null &&
                selectedDriver.snappedLongitude !== null ? (
                  <div className="fleet-telemetry-kv-span">
                    <dt>Yol üstü (snap)</dt>
                    <dd>
                      {formatCoordinate(selectedDriver.snappedLatitude)},{" "}
                      {formatCoordinate(selectedDriver.snappedLongitude)}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>Hız</dt>
                  <dd>
                    {selectedDriver.lastSpeedKmh !== null
                      ? `${selectedDriver.lastSpeedKmh.toFixed(1)} km/s`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Yön</dt>
                  <dd>
                    {selectedDriver.lastHeadingDegrees !== null
                      ? `${Math.round(selectedDriver.lastHeadingDegrees)}°`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Rakım</dt>
                  <dd>{formatOptionalMeters(selectedDriver.lastAltitudeMeters)}</dd>
                </div>
                <div>
                  <dt>Dikey doğruluk</dt>
                  <dd>
                    {formatOptionalMeters(selectedDriver.lastVerticalAccuracyMeters)}
                  </dd>
                </div>
                <div>
                  <dt>GPS doğruluk</dt>
                  <dd>
                    {formatOptionalMeters(
                      selectedDriver.lastHorizontalAccuracyMeters,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Hız kaynağı</dt>
                  <dd>{selectedDriver.lastSpeedSourceCode ?? "—"}</dd>
                </div>
              </dl>
              {routeError ? (
                <p className="error banner error--light">{routeError}</p>
              ) : null}
              {selectedRoute ? (
                <>
                  <p className="fleet-entity-meta">
                    Konum örneği: {selectedRoute.locationSampleCount}
                    {selectedRoute.breadcrumbPoints.length > 0
                      ? ` · iz ${selectedRoute.breadcrumbPoints.length} nokta`
                      : ""}
                    {selectedRoute.distanceKm !== null
                      ? ` · ${selectedRoute.distanceKm} km (yol)`
                      : ""}
                    · Güvenlik: {selectedRoute.safetyMarkers.length}
                    · POI: {(selectedRoute.routePois ?? []).length}
                    {selectedRoute.roadGeometryStatus === "PENDING"
                      ? " · Yol hesaplanıyor…"
                      : ""}
                  </p>
                  {selectedRoute.recentFeed.length > 0 ? (
                    <div className="fleet-telemetry-feed">
                      <h3 className="fleet-telemetry-feed-title">
                        Son telemetri
                      </h3>
                      <ul className="fleet-telemetry-feed-list">
                        {selectedRoute.recentFeed.slice(0, 12).map((item) => (
                          <li
                            key={`${item.eventTypeCode}-${item.recordedAt}`}
                            className={
                              item.severityCode === "CRITICAL"
                                ? "fleet-telemetry-feed-item fleet-telemetry-feed-item--critical"
                                : item.severityCode === "WARNING"
                                  ? "fleet-telemetry-feed-item fleet-telemetry-feed-item--warning"
                                  : "fleet-telemetry-feed-item"
                            }
                          >
                            <time dateTime={item.recordedAt}>
                              {new Date(item.recordedAt).toLocaleTimeString(
                                "tr-TR",
                              )}
                            </time>
                            <span>{item.detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="fleet-entity-meta">
                      Henüz olay kaydı yok. Şoför companion sayfasında
                      «Konumu paylaş» açık olsun.
                    </p>
                  )}
                </>
              ) : (
                <p className="fleet-entity-meta">Rota yükleniyor…</p>
              )}
              <div className="fleet-live-map-poi-toggles">
                <label>
                  <input
                    type="checkbox"
                    checked={showWeighStations}
                    onChange={(event) =>
                      setShowWeighStations(event.target.checked)
                    }
                  />
                  Kantarlar
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={showTruckParking}
                    onChange={(event) =>
                      setShowTruckParking(event.target.checked)
                    }
                  />
                  Tır parkları
                </label>
              </div>
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
