export type TelemetryConsentSnapshot = {
  consentDocumentVersion: string;
  grantedAt: string | null;
  revokedAt: string | null;
  trackingEnabled: boolean;
  purposes: readonly string[];
  legalBasisSummary: string;
  retentionDaysRawSamples: number;
  retentionDaysSafetyEvents: number;
};

export type TelemetryDeviceSummary = {
  deviceId: string;
  platformCode: string;
  deviceLabel: string | null;
  trackingEnabled: boolean;
  lastSeenAt: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastSpeedKmh: number | null;
};

export type TelemetryDriverStatusSnapshot = {
  consent: TelemetryConsentSnapshot;
  device: TelemetryDeviceSummary | null;
  recentEvents: readonly TelemetryEventSummary[];
  activeTripId: string | null;
};

export type TelemetryEventSummary = {
  eventId: string;
  eventTypeCode: string;
  recordedAt: string;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number | null;
  severity: "INFO" | "WARNING" | "CRITICAL" | null;
};

export type TelemetryEnrollResult = {
  deviceId: string;
  ingestToken: string;
  consent: TelemetryConsentSnapshot;
};
