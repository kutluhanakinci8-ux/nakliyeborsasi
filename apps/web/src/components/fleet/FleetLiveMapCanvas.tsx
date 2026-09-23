"use client";

import { useEffect, useRef } from "react";
import type {
  FleetDriverRouteSnapshot,
  FleetLiveDriverPin,
} from "../../lib/TelemetryApiClient";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const STATE_COLOR: Record<string, string> = {
  LIVE: "#16a34a",
  STALE: "#d97706",
  OFFLINE: "#64748b",
  NO_SIGNAL: "#94a3b8",
};

const SAFETY_COLOR: Record<string, string> = {
  HARSH_BRAKE: "#dc2626",
  HARSH_ACCELERATION: "#ea580c",
  SPEED_EXCEEDED: "#ca8a04",
  STOP_DETECTED: "#2563eb",
  SHARP_TURN: "#7c3aed",
};

function speedToColor(speedKmh: number): string {
  if (speedKmh < 30) {
    return "#22c55e";
  }
  if (speedKmh < 60) {
    return "#84cc16";
  }
  if (speedKmh < 90) {
    return "#eab308";
  }
  if (speedKmh < 110) {
    return "#f97316";
  }
  return "#ef4444";
}

type FleetLiveMapCanvasProps = {
  drivers: readonly FleetLiveDriverPin[];
  selectedDriverId: string | null;
  selectedRoute: FleetDriverRouteSnapshot | null;
  onSelectDriver: (driverId: string) => void;
};

export function FleetLiveMapCanvas({
  drivers,
  selectedDriverId,
  selectedRoute,
  onSelectDriver,
}: FleetLiveMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

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
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !layer || !routeLayer) {
      return;
    }
    layer.clearLayers();
    routeLayer.clearLayers();

    if (selectedRoute) {
      const road = selectedRoute.roadGeometry;
      const boundsCoords: L.LatLngExpression[] = [];

      if (road && road.coordinates.length > 1) {
        if (selectedRoute.speedSegments.length > 1) {
          for (const segment of selectedRoute.speedSegments) {
            const latLngs = segment.coordinates.map(
              (position) => [position[1], position[0]] as L.LatLngExpression,
            );
            L.polyline(latLngs, {
              color: speedToColor(segment.speedKmh),
              weight: 5,
              opacity: 0.9,
            }).addTo(routeLayer);
            for (const ll of latLngs) {
              boundsCoords.push(ll);
            }
          }
        } else {
          const latLngs = road.coordinates.map(
            (position) => [position[1], position[0]] as L.LatLngExpression,
          );
          L.polyline(latLngs, {
            color: "#1d4ed8",
            weight: 4,
            opacity: 0.85,
          }).addTo(routeLayer);
          boundsCoords.push(...latLngs);
        }
      } else if (selectedRoute.routePoints.length > 1) {
        const latLngs = selectedRoute.routePoints.map(
          (point) => [point.latitude, point.longitude] as L.LatLngExpression,
        );
        L.polyline(latLngs, {
          color: "#94a3b8",
          weight: 3,
          opacity: 0.6,
          dashArray: "6 8",
        }).addTo(routeLayer);
        boundsCoords.push(...latLngs);
      }

      if (selectedRoute.routePoints.length > 0) {
        const start = selectedRoute.routePoints[0];
        const end =
          selectedRoute.routePoints[selectedRoute.routePoints.length - 1];
        L.circleMarker([start.latitude, start.longitude], {
          radius: 6,
          color: "#0f172a",
          fillColor: "#22c55e",
          fillOpacity: 1,
        })
          .bindPopup("Rota başlangıcı")
          .addTo(routeLayer);
        L.circleMarker([end.latitude, end.longitude], {
          radius: 6,
          color: "#0f172a",
          fillColor: "#1d4ed8",
          fillOpacity: 1,
        })
          .bindPopup("Son konum")
          .addTo(routeLayer);
      }

      for (const marker of selectedRoute.safetyMarkers) {
        const lat = marker.roadLatitude ?? marker.latitude;
        const lng = marker.roadLongitude ?? marker.longitude;
        L.circleMarker([lat, lng], {
          radius: 5,
          color: "#fff",
          weight: 1,
          fillColor: SAFETY_COLOR[marker.eventTypeCode] ?? "#64748b",
          fillOpacity: 0.95,
        })
          .bindPopup(
            marker.speedLimitKmh
              ? `${marker.eventTypeCode.replaceAll("_", " ")} (limit ${marker.speedLimitKmh} km/s)`
              : marker.eventTypeCode.replaceAll("_", " "),
          )
          .addTo(routeLayer);
      }

      if (boundsCoords.length > 1) {
        map.fitBounds(L.latLngBounds(boundsCoords), {
          padding: [40, 40],
          maxZoom: 14,
        });
      }
    }

    const positioned = drivers.filter(
      (driver) => driver.latitude !== null && driver.longitude !== null,
    );
    const bounds: L.LatLngExpression[] = [];
    for (const driver of positioned) {
      const lat =
        driver.snappedLatitude ?? (driver.latitude as number);
      const lng =
        driver.snappedLongitude ?? (driver.longitude as number);
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
        }<br/>${
          driver.lastSpeedKmh !== null
            ? `${Math.round(driver.lastSpeedKmh)} km/s`
            : "—"
        }`,
      );
      marker.on("click", () => onSelectDriver(driver.driverId));
      marker.addTo(layer);
    }
    if (!selectedRoute?.routePoints.length && bounds.length === 1) {
      map.setView(bounds[0], 12);
    } else if (!selectedRoute?.routePoints.length && bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [48, 48], maxZoom: 12 });
    }
  }, [drivers, onSelectDriver, selectedDriverId, selectedRoute]);

  return <div ref={containerRef} className="fleet-live-map-canvas" />;
}
