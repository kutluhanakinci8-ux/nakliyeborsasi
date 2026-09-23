import {
  TELEMETRY_CONSENT_DOCUMENT_VERSION,
  TelemetryConsentPurposeCode,
  TelemetryConsentSnapshot,
  TelemetryDeviceSummary,
  TelemetryDriverStatusSnapshot,
  TelemetryEventSummary,
} from "@nakliyeborsasi/core";
import { FleetTelemetryConsentLogEntity } from "../../../infrastructure/database/entities/FleetTelemetryConsentLogEntity";
import { FleetTelemetryDeviceEntity } from "../../../infrastructure/database/entities/FleetTelemetryDeviceEntity";
import { FleetTelemetryEventEntity } from "../../../infrastructure/database/entities/FleetTelemetryEventEntity";

const RETENTION_RAW_DAYS = 90;
const RETENTION_SAFETY_DAYS = 365;

export class TelemetryMapper {
  public static consentSnapshot(
    device: FleetTelemetryDeviceEntity | null,
    consentLog: FleetTelemetryConsentLogEntity | null,
  ): TelemetryConsentSnapshot {
    const grantedAt =
      device?.consentGrantedAt?.toISOString() ??
      (consentLog?.actionCode === "GRANT" || consentLog?.actionCode === "ENROLL"
        ? consentLog.createdAt.toISOString()
        : null);
    const revokedAt =
      device?.consentRevokedAt?.toISOString() ??
      (consentLog?.actionCode === "REVOKE"
        ? consentLog.createdAt.toISOString()
        : null);
    const trackingEnabled =
      consentLog?.actionCode !== "REVOKE" &&
      (consentLog?.actionCode === "GRANT" ||
        consentLog?.actionCode === "ENROLL" ||
        Boolean(device?.trackingEnabled && !device.consentRevokedAt));
    return {
      consentDocumentVersion:
        device?.consentDocumentVersion ??
        consentLog?.consentDocumentVersion ??
        TELEMETRY_CONSENT_DOCUMENT_VERSION,
      grantedAt,
      revokedAt,
      trackingEnabled,
      purposes: [
        TelemetryConsentPurposeCode.FleetSafety,
        TelemetryConsentPurposeCode.DispatchEta,
        TelemetryConsentPurposeCode.RegulatoryEvidence,
      ],
      legalBasisSummary:
        "İş sözleşmesi / taşıma görevi (konum) ve açık rıza (hareket sensörleri).",
      retentionDaysRawSamples: RETENTION_RAW_DAYS,
      retentionDaysSafetyEvents: RETENTION_SAFETY_DAYS,
    };
  }

  public static deviceSummary(
    device: FleetTelemetryDeviceEntity | null,
  ): TelemetryDeviceSummary | null {
    if (!device) {
      return null;
    }
    return {
      deviceId: device.id,
      platformCode: device.platformCode,
      deviceLabel: device.deviceLabel,
      trackingEnabled: device.trackingEnabled,
      lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
      lastLatitude: device.lastLatitude,
      lastLongitude: device.lastLongitude,
      lastSpeedKmh: device.lastSpeedKmh,
    };
  }

  public static driverStatus(params: {
    device: FleetTelemetryDeviceEntity | null;
    recentEvents: readonly FleetTelemetryEventEntity[];
    consentLog: FleetTelemetryConsentLogEntity | null;
  }): TelemetryDriverStatusSnapshot {
    return {
      consent: this.consentSnapshot(params.device, params.consentLog),
      device: this.deviceSummary(params.device),
      recentEvents: params.recentEvents.map((row) => this.eventSummary(row)),
      activeTripId: params.device?.activeTripCorrelationId ?? null,
    };
  }

  public static eventSummary(row: FleetTelemetryEventEntity): TelemetryEventSummary {
    return {
      eventId: row.id,
      eventTypeCode: row.eventTypeCode,
      recordedAt: row.recordedAt.toISOString(),
      latitude: row.latitude,
      longitude: row.longitude,
      speedKmh: row.speedKmh,
      severity: row.severityCode as TelemetryEventSummary["severity"],
    };
  }
}
