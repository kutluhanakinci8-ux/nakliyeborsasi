import { TelemetryEventTypeCode } from "@nakliyeborsasi/core";
import { FleetTelemetryEventEntity } from "../../../infrastructure/database/entities/FleetTelemetryEventEntity";

const LABELS: Record<string, string> = {
  LOCATION_SAMPLE: "Konum örneği",
  MOTION_SAMPLE: "IMU örneği",
  TRIP_START: "Sefer başladı",
  TRIP_END: "Sefer bitti",
  STOP_DETECTED: "Durak",
  IDLE_START: "Uzun bekleme",
  IDLE_END: "Bekleme bitti",
  SPEED_EXCEEDED: "Hız limiti",
  HARSH_BRAKE: "Sert fren",
  HARSH_ACCELERATION: "Sert kalkış",
  SHARP_TURN: "Sert viraj",
  COLLISION_SUSPECTED: "Olası çarpışma",
  ENGINE_IDLE_SUSPECTED: "Rölanti (tahmin)",
  PHONE_DISTRACTION_SUSPECTED: "Dikkat dağınıklığı",
  DEVICE_HEARTBEAT: "Cihaz nabız",
};

export class TelemetryCarrierFeedFormatter {
  public static toFeedItem(event: FleetTelemetryEventEntity): {
    eventTypeCode: string;
    recordedAt: string;
    severityCode: string | null;
    speedKmh: number | null;
    altitudeMeters: number | null;
    verticalAccuracyMeters: number | null;
    detail: string;
  } {
    const payload = event.payloadJson;
    const altitude = this.readNumber(payload, "altitudeMeters");
    const vertical = this.readNumber(payload, "verticalAccuracyMeters");
    const label = LABELS[event.eventTypeCode] ?? event.eventTypeCode;
    const detail = this.buildDetail(event, payload, label);
    return {
      eventTypeCode: event.eventTypeCode,
      recordedAt: event.recordedAt.toISOString(),
      severityCode: event.severityCode,
      speedKmh: event.speedKmh,
      altitudeMeters: altitude,
      verticalAccuracyMeters: vertical,
      detail,
    };
  }

  private static buildDetail(
    event: FleetTelemetryEventEntity,
    payload: Record<string, unknown> | null,
    label: string,
  ): string {
    const code = event.eventTypeCode;
    if (code === TelemetryEventTypeCode.LocationSample) {
      const parts: string[] = [label];
      if (event.latitude !== null && event.longitude !== null) {
        parts.push(
          `${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}`,
        );
      }
      if (event.speedKmh !== null) {
        parts.push(`${event.speedKmh.toFixed(1)} km/s`);
      }
      const alt = this.readNumber(payload, "altitudeMeters");
      const vert = this.readNumber(payload, "verticalAccuracyMeters");
      const src = payload?.speedSourceCode;
      if (alt !== null) {
        parts.push(`rakım ${Math.round(alt)} m`);
      }
      if (vert !== null) {
        parts.push(`±${Math.round(vert)} m dikey`);
      }
      if (typeof src === "string") {
        parts.push(`hız kaynağı ${src}`);
      }
      if (event.horizontalAccuracyMeters !== null) {
        parts.push(`GPS ±${Math.round(event.horizontalAccuracyMeters)} m`);
      }
      return parts.join(" · ");
    }
    if (code === TelemetryEventTypeCode.MotionSample) {
      const mag = this.readNumber(payload, "magnitudeMs2");
      return mag !== null ? `${label} · ${mag.toFixed(1)} m/s²` : label;
    }
    if (code === TelemetryEventTypeCode.SpeedExceeded) {
      const limit = this.readNumber(payload, "thresholdKmh");
      const speed = event.speedKmh ?? this.readNumber(payload, "speedKmh");
      if (limit !== null && speed !== null) {
        return `${label} · ${Math.round(speed)} / ${Math.round(limit)} km/s`;
      }
    }
    if (code === TelemetryEventTypeCode.IdleStart) {
      const sec = this.readNumber(payload, "idleSeconds");
      if (sec !== null) {
        return `${label} · ${Math.floor(sec / 60)} dk`;
      }
    }
    return label;
  }

  private static readNumber(
    payload: Record<string, unknown> | null,
    key: string,
  ): number | null {
    if (!payload) {
      return null;
    }
    const raw = payload[key];
    return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  }
}
