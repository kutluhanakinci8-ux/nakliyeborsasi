import { PublicApiConfiguration } from "./PublicApiConfiguration";

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

export type TelemetryEventSummary = {
  eventId: string;
  eventTypeCode: string;
  recordedAt: string;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number | null;
  severity: "INFO" | "WARNING" | "CRITICAL" | null;
};

export type TelemetryDriverStatusSnapshot = {
  consent: TelemetryConsentSnapshot;
  device: TelemetryDeviceSummary | null;
  recentEvents: readonly TelemetryEventSummary[];
  activeTripId: string | null;
};

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

export type TelemetryEnrollResult = {
  deviceId: string;
  ingestToken: string;
  consent: TelemetryConsentSnapshot;
};

export class TelemetryApiClient {
  private static authHeaders(accessToken: string): HeadersInit {
    return {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }

  public static async fetchCarrierLiveMap(
    accessToken: string,
    locale: string,
  ): Promise<FleetLiveMapSnapshot> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/fleet/telematics/carrier/live?lang=${locale}`,
      { headers: this.authHeaders(accessToken) },
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const payload = (await response.json()) as { liveMap: FleetLiveMapSnapshot };
    return payload.liveMap;
  }

  public static async fetchStatus(
    accessToken: string,
  ): Promise<TelemetryDriverStatusSnapshot> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/fleet/telematics/driver/status`,
      { headers: this.authHeaders(accessToken) },
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const payload = (await response.json()) as {
      telematics: TelemetryDriverStatusSnapshot;
    };
    return payload.telematics;
  }

  public static async grantConsent(
    accessToken: string,
  ): Promise<TelemetryDriverStatusSnapshot> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/fleet/telematics/driver/consent`,
      {
        method: "POST",
        headers: this.authHeaders(accessToken),
      },
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const payload = (await response.json()) as {
      telematics: TelemetryDriverStatusSnapshot;
    };
    return payload.telematics;
  }

  public static async revokeConsent(
    accessToken: string,
  ): Promise<TelemetryDriverStatusSnapshot> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/fleet/telematics/driver/consent/revoke`,
      {
        method: "POST",
        headers: this.authHeaders(accessToken),
      },
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const payload = (await response.json()) as {
      telematics: TelemetryDriverStatusSnapshot;
    };
    return payload.telematics;
  }

  public static async enrollDevice(
    accessToken: string,
    body: { platformCode: string; deviceLabel?: string },
  ): Promise<TelemetryEnrollResult> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/fleet/telematics/driver/devices/enroll`,
      {
        method: "POST",
        headers: this.authHeaders(accessToken),
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const payload = (await response.json()) as { enrollment: TelemetryEnrollResult };
    return payload.enrollment;
  }

  public static async ingestBatch(params: {
    deviceId: string;
    ingestToken: string;
    batchId: string;
    events: Array<{
      eventTypeCode: string;
      recordedAt: string;
      latitude?: number;
      longitude?: number;
      speedKmh?: number;
      headingDegrees?: number;
      horizontalAccuracyMeters?: number;
      payload?: Record<string, unknown>;
    }>;
  }): Promise<void> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/fleet/telematics/ingest/batch`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-NB-Device-Token": params.ingestToken,
        },
        body: JSON.stringify({
          deviceId: params.deviceId,
          batchId: params.batchId,
          events: params.events,
        }),
      },
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
  }
}
