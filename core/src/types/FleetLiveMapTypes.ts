export type FleetLiveTrackingState = "LIVE" | "STALE" | "OFFLINE" | "NO_SIGNAL";

export type FleetLiveDriverPin = {
  driverId: string;
  displayName: string;
  primaryPhoneE164: string | null;
  licensePlateDisplay: string | null;
  latitude: number | null;
  longitude: number | null;
  lastSpeedKmh: number | null;
  lastSeenAt: string | null;
  trackingState: FleetLiveTrackingState;
};

export type FleetLiveMapSnapshot = {
  updatedAt: string;
  drivers: readonly FleetLiveDriverPin[];
};
