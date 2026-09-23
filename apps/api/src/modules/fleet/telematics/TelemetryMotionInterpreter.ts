import { randomUUID } from "node:crypto";
import { TelemetryEventTypeCode } from "@nakliyeborsasi/core";
import { FleetTelemetryDeviceEntity } from "../../../infrastructure/database/entities/FleetTelemetryDeviceEntity";

export type IngestEventInput = {
  eventTypeCode: string;
  recordedAt: Date;
  latitude?: number;
  longitude?: number;
  speedKmh?: number;
  headingDegrees?: number;
  horizontalAccuracyMeters?: number;
  payload?: Record<string, unknown>;
};

export type DerivedTelemetryEvent = {
  eventTypeCode: string;
  recordedAt: Date;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number | null;
  headingDegrees: number | null;
  horizontalAccuracyMeters: number | null;
  severityCode: string | null;
  tripCorrelationId: string | null;
  payloadJson: Record<string, unknown> | null;
};

const STOP_SPEED_KMH = 8;
const SPEED_LIMIT_DEFAULT_KMH = 90;

export class TelemetryMotionInterpreter {
  public static interpretBatch(
    device: FleetTelemetryDeviceEntity,
    events: readonly IngestEventInput[],
  ): DerivedTelemetryEvent[] {
    const derived: DerivedTelemetryEvent[] = [];
    let tripId = device.activeTripCorrelationId;
    let wasMoving = Boolean(tripId);

    for (const event of events) {
      const row = this.toDerived(event, tripId);
      row.severityCode = this.resolveSeverity(event.eventTypeCode);
      derived.push(row);

      const speed = event.speedKmh ?? null;
      if (
        event.eventTypeCode === TelemetryEventTypeCode.LocationSample &&
        speed !== null
      ) {
        const moving = speed > STOP_SPEED_KMH;
        if (moving && !wasMoving) {
          tripId = randomUUID();
          wasMoving = true;
          derived.push({
            ...row,
            eventTypeCode: TelemetryEventTypeCode.TripStart,
            tripCorrelationId: tripId,
            severityCode: "INFO",
            payloadJson: { autoDetected: true },
          });
        }
        if (!moving && wasMoving) {
          wasMoving = false;
          derived.push({
            ...row,
            eventTypeCode: TelemetryEventTypeCode.StopDetected,
            tripCorrelationId: tripId,
            severityCode: "INFO",
            payloadJson: { autoDetected: true, speedKmh: speed },
          });
          derived.push({
            ...row,
            eventTypeCode: TelemetryEventTypeCode.TripEnd,
            tripCorrelationId: tripId,
            severityCode: "INFO",
            payloadJson: { autoDetected: true },
          });
          tripId = null;
        }
        if (moving && speed > SPEED_LIMIT_DEFAULT_KMH) {
          derived.push({
            ...row,
            eventTypeCode: TelemetryEventTypeCode.SpeedExceeded,
            tripCorrelationId: tripId,
            severityCode: "WARNING",
            payloadJson: {
              speedKmh: speed,
              thresholdKmh: SPEED_LIMIT_DEFAULT_KMH,
            },
          });
        }
      }
    }

    device.activeTripCorrelationId = tripId;
    return derived;
  }

  private static resolveSeverity(
    eventTypeCode: string,
  ): "INFO" | "WARNING" | "CRITICAL" | null {
    if (eventTypeCode === TelemetryEventTypeCode.CollisionSuspected) {
      return "CRITICAL";
    }
    if (
      eventTypeCode === TelemetryEventTypeCode.HarshBrake ||
      eventTypeCode === TelemetryEventTypeCode.HarshAcceleration ||
      eventTypeCode === TelemetryEventTypeCode.SharpTurn ||
      eventTypeCode === TelemetryEventTypeCode.SpeedExceeded
    ) {
      return "WARNING";
    }
    if (
      eventTypeCode === TelemetryEventTypeCode.DeviceHeartbeat ||
      eventTypeCode === TelemetryEventTypeCode.LocationSample
    ) {
      return "INFO";
    }
    return null;
  }

  private static toDerived(
    event: IngestEventInput,
    tripId: string | null,
  ): DerivedTelemetryEvent {
    return {
      eventTypeCode: event.eventTypeCode,
      recordedAt: event.recordedAt,
      latitude: event.latitude ?? null,
      longitude: event.longitude ?? null,
      speedKmh: event.speedKmh ?? null,
      headingDegrees: event.headingDegrees ?? null,
      horizontalAccuracyMeters: event.horizontalAccuracyMeters ?? null,
      severityCode: null,
      tripCorrelationId: tripId,
      payloadJson: event.payload ?? null,
    };
  }
}
