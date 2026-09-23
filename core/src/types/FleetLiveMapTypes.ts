import type { GeoJsonLineString } from "./GeoJsonTypes";
import type { TelemetryRoadGeometryStatusCode } from "../constants/TelemetryRoadGeometryStatusCode";

export type FleetLiveTrackingState = "LIVE" | "STALE" | "OFFLINE" | "NO_SIGNAL";

export type FleetMotionPhase =
  | "UNKNOWN"
  | "STOPPED"
  | "MOVING"
  | "ACCELERATING"
  | "DECELERATING";

export type FleetLiveDriverPin = {
  driverId: string;
  displayName: string;
  primaryPhoneE164: string | null;
  licensePlateDisplay: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Snap-to-road position when routing engine is available (Faz A). */
  snappedLatitude: number | null;
  snappedLongitude: number | null;
  lastSpeedKmh: number | null;
  lastHeadingDegrees: number | null;
  lastSeenAt: string | null;
  trackingState: FleetLiveTrackingState;
  motionPhase: FleetMotionPhase;
  speedDeltaKmh: number | null;
};

export type FleetRoutePoint = {
  recordedAt: string;
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  headingDegrees: number | null;
};

export type FleetRouteSafetyMarker = {
  eventTypeCode: string;
  recordedAt: string;
  latitude: number;
  longitude: number;
  severityCode: string | null;
  /** Snapped position on road when available (Faz C). */
  roadLatitude: number | null;
  roadLongitude: number | null;
  speedLimitKmh: number | null;
};

export type FleetRouteSpeedSegment = {
  /** GeoJSON positions [lng, lat] along this colored segment. */
  coordinates: readonly [number, number][];
  speedKmh: number;
};

export type FleetRoutePoiMarker = {
  poiId: string;
  kindCode: string;
  displayName: string;
  latitude: number;
  longitude: number;
  distanceFromStartKm: number;
  distanceToRouteMeters: number;
  sourceCode: string;
};

export type FleetDriverRouteSnapshot = {
  driverId: string;
  displayName: string;
  motionPhase: FleetMotionPhase;
  speedDeltaKmh: number | null;
  routePoints: readonly FleetRoutePoint[];
  safetyMarkers: readonly FleetRouteSafetyMarker[];
  roadGeometry: GeoJsonLineString | null;
  roadGeometryStatus: TelemetryRoadGeometryStatusCode;
  matchedRouteId: string | null;
  distanceKm: number | null;
  speedSegments: readonly FleetRouteSpeedSegment[];
  routePois: readonly FleetRoutePoiMarker[];
  updatedAt: string;
};

export type FleetLiveMapSnapshot = {
  updatedAt: string;
  drivers: readonly FleetLiveDriverPin[];
};
