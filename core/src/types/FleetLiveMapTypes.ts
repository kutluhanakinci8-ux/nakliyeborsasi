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
  /** Son LOCATION_SAMPLE payload veya native fix. */
  lastAltitudeMeters: number | null;
  lastVerticalAccuracyMeters: number | null;
  lastSpeedSourceCode: string | null;
  lastHorizontalAccuracyMeters: number | null;
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
  altitudeMeters?: number | null;
  verticalAccuracyMeters?: number | null;
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
  /** Haritada rota üzerinde gösterim (koridora projeksiyon). */
  mapLatitude: number;
  mapLongitude: number;
  distanceFromStartKm: number;
  distanceToRouteMeters: number;
  sourceCode: string;
};

export type FleetTelemetryFeedItem = {
  eventTypeCode: string;
  recordedAt: string;
  severityCode: string | null;
  speedKmh: number | null;
  altitudeMeters: number | null;
  verticalAccuracyMeters: number | null;
  /** Kısa Türkçe özet (filo paneli). */
  detail: string;
};

export type FleetDriverRouteSnapshot = {
  driverId: string;
  displayName: string;
  motionPhase: FleetMotionPhase;
  speedDeltaKmh: number | null;
  /** Ham GPS örnekleri (dururken de görünür); harita izi için. */
  breadcrumbPoints: readonly FleetRoutePoint[];
  locationSampleCount: number;
  recentFeed: readonly FleetTelemetryFeedItem[];
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
