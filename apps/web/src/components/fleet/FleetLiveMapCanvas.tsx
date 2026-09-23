"use client";

import { useEffect, useRef } from "react";
import type { FleetLiveDriverPin } from "../../lib/TelemetryApiClient";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const STATE_COLOR: Record<string, string> = {
  LIVE: "#16a34a",
  STALE: "#d97706",
  OFFLINE: "#64748b",
  NO_SIGNAL: "#94a3b8",
};

type FleetLiveMapCanvasProps = {
  drivers: readonly FleetLiveDriverPin[];
  selectedDriverId: string | null;
  onSelectDriver: (driverId: string) => void;
};

export function FleetLiveMapCanvas({
  drivers,
  selectedDriverId,
  onSelectDriver,
}: FleetLiveMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }
    const map = L.map(containerRef.current, {
      center: [39.0, 35.0],
      zoom: 5,
      scrollWheelZoom: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersRef.current;
    if (!map || !layer) {
      return;
    }
    layer.clearLayers();
    const positioned = drivers.filter(
      (driver) => driver.latitude !== null && driver.longitude !== null,
    );
    const bounds: L.LatLngExpression[] = [];
    for (const driver of positioned) {
      const lat = driver.latitude as number;
      const lng = driver.longitude as number;
      bounds.push([lat, lng]);
      const color = STATE_COLOR[driver.trackingState] ?? "#1d4ed8";
      const marker = L.circleMarker([lat, lng], {
        radius: selectedDriverId === driver.driverId ? 11 : 8,
        color: selectedDriverId === driver.driverId ? "#0f172a" : color,
        weight: selectedDriverId === driver.driverId ? 3 : 2,
        fillColor: color,
        fillOpacity: 0.9,
      });
      marker.bindPopup(
        `<strong>${driver.displayName}</strong><br/>${
          driver.licensePlateDisplay ?? "Araç yok"
        }<br/>${driver.lastSpeedKmh !== null ? `${Math.round(driver.lastSpeedKmh)} km/s` : "—"}`,
      );
      marker.on("click", () => onSelectDriver(driver.driverId));
      marker.addTo(layer);
    }
    if (bounds.length === 1) {
      map.setView(bounds[0], 12);
    } else if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [48, 48], maxZoom: 12 });
    }
  }, [drivers, onSelectDriver, selectedDriverId]);

  return <div ref={containerRef} className="fleet-live-map-canvas" />;
}
