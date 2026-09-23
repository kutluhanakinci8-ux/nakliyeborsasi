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
};

export type FleetDriverRouteSnapshot = {
  driverId: string;
  displayName: string;
  motionPhase: FleetMotionPhase;
  speedDeltaKmh: number | null;
  routePoints: readonly FleetRoutePoint[];
  safetyMarkers: readonly FleetRouteSafetyMarker[];
  updatedAt: string;
};

export type FleetLiveMapSnapshot = {
  updatedAt: string;
  drivers: readonly FleetLiveDriverPin[];
};
