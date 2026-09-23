import { randomUUID } from "node:crypto";
import {
  TelemetryConsentPurposeCode,
  TelemetryEventTypeCode,
  TELEMETRY_COLLISION_ACCEL_MS2,
  TELEMETRY_ENGINE_IDLE_SUSPECT_SECONDS,
  TELEMETRY_HARSH_ACCEL_MS2,
  TELEMETRY_HARSH_BRAKE_DECEL_MS2,
  TELEMETRY_IDLE_SPEED_KMH,
  TELEMETRY_IDLE_START_SECONDS,
  TELEMETRY_LONG_IDLE_SECONDS,
  TELEMETRY_DEFAULT_SPEED_LIMIT_KMH,
  TELEMETRY_SHARP_TURN_HEADING_DELTA_DEG,
  TELEMETRY_SHARP_TURN_MIN_SPEED_KMH,
  TELEMETRY_SHARP_TURN_WINDOW_MS,
  TELEMETRY_SPEED_EXCEEDED_COOLDOWN_MS,
  TELEMETRY_STOP_SPEED_KMH,
} from "@nakliyeborsasi/core";
import { FleetTelemetryDeviceEntity } from "../../../infrastructure/database/entities/FleetTelemetryDeviceEntity";

export type IngestEventInput = {
  eventTypeCode: string;
  recordedAt: Date;
  latitude?: number;
  longitude?: number;
  speedKmh?: number;
  headingDegrees?: number;
  horizontalAccuracyMeters?: number;
  altitudeMeters?: number;
  verticalAccuracyMeters?: number;
  speedSourceCode?: string;
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

type InterpreterState = {
  stopSinceMs?: number;
  idleActive?: boolean;
  engineIdleSinceMs?: number;
  engineIdleEmitted?: boolean;
  lastHeadingDeg?: number;
  lastHeadingAtMs?: number;
  lastSpeedExceededEmitMs?: number;
};

export class TelemetryMotionInterpreter {
  public static interpretBatch(
    device: FleetTelemetryDeviceEntity,
    events: readonly IngestEventInput[],
  ): DerivedTelemetryEvent[] {
    const state = this.loadState(device);
    const derived: DerivedTelemetryEvent[] = [];
    let tripId = device.activeTripCorrelationId;
    let wasMoving = Boolean(tripId);

    for (const event of events) {
      if (
        event.eventTypeCode ===
        TelemetryEventTypeCode.PhoneDistractionSuspected
      ) {
        if (!this.distractionConsentOk(event.payload)) {
          continue;
        }
      }

      const enrichedPayload = this.enrichLocationPayload(event);
      const row = this.toDerived(event, tripId, enrichedPayload);
      row.severityCode = this.resolveSeverity(event.eventTypeCode);
      derived.push(row);

      if (event.eventTypeCode === TelemetryEventTypeCode.MotionSample) {
        derived.push(
          ...this.deriveFromMotionSample(event, tripId, enrichedPayload),
        );
      }

      const speed = event.speedKmh ?? null;
      const recordedMs = event.recordedAt.getTime();

      if (event.eventTypeCode === TelemetryEventTypeCode.LocationSample) {
        derived.push(
          ...this.deriveSharpTurn(event, tripId, state, speed, recordedMs),
        );
        if (speed !== null) {
          const moving = speed > TELEMETRY_STOP_SPEED_KMH;
          if (moving && !wasMoving) {
            tripId = randomUUID();
            wasMoving = true;
            this.clearStopTimers(state);
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
            const stopPayload = {
              autoDetected: true,
              speedKmh: speed,
              stopDurationSeconds: this.stopDurationSeconds(state, recordedMs),
            };
            derived.push({
              ...row,
              eventTypeCode: TelemetryEventTypeCode.StopDetected,
              tripCorrelationId: tripId,
              severityCode: "INFO",
              payloadJson: stopPayload,
            });
            derived.push({
              ...row,
              eventTypeCode: TelemetryEventTypeCode.TripEnd,
              tripCorrelationId: tripId,
              severityCode: "INFO",
              payloadJson: { autoDetected: true },
            });
            tripId = null;
            this.clearStopTimers(state);
          }
          if (!moving) {
            derived.push(
              ...this.trackIdleAndEngine(
                event,
                tripId,
                state,
                speed,
                recordedMs,
                row,
              ),
            );
          } else {
            this.clearStopTimers(state);
          }
          if (moving) {
            derived.push(
              ...this.maybeSpeedExceeded(event, tripId, state, speed, row),
            );
          }
        }
      }
    }

    device.activeTripCorrelationId = tripId;
    device.interpreterStateJson = state;
    return derived;
  }

  private static loadState(device: FleetTelemetryDeviceEntity): InterpreterState {
    const raw = device.interpreterStateJson;
    if (!raw || typeof raw !== "object") {
      return {};
    }
    return raw as InterpreterState;
  }

  private static enrichLocationPayload(
    event: IngestEventInput,
  ): Record<string, unknown> | null {
    const base = { ...(event.payload ?? {}) };
    let touched = Boolean(event.payload);
    if (event.altitudeMeters !== undefined) {
      base.altitudeMeters = event.altitudeMeters;
      touched = true;
    }
    if (event.verticalAccuracyMeters !== undefined) {
      base.verticalAccuracyMeters = event.verticalAccuracyMeters;
      touched = true;
    }
    if (event.speedSourceCode) {
      base.speedSourceCode = event.speedSourceCode;
      touched = true;
    }
    return touched ? base : event.payload ?? null;
  }

  private static distractionConsentOk(
    payload?: Record<string, unknown>,
  ): boolean {
    if (!payload) {
      return false;
    }
    if (payload.distractionConsentGranted === true) {
      return true;
    }
    const purposes = payload.consentPurposes;
    if (Array.isArray(purposes)) {
      return purposes.includes(
        TelemetryConsentPurposeCode.DriverDistractionAnalytics,
      );
    }
    return false;
  }

  private static deriveFromMotionSample(
    event: IngestEventInput,
    tripId: string | null,
    payload: Record<string, unknown> | null,
  ): DerivedTelemetryEvent[] {
    const out: DerivedTelemetryEvent[] = [];
    const linear = this.readVec3(payload, "linearAccelerationMs2");
    const accel = linear ?? this.readVec3(payload, "accelerationIncludingGravityMs2");
    if (!accel) {
      return out;
    }
    const magnitude = Math.hypot(accel.x, accel.y, accel.z);
    const row = this.toDerived(event, tripId, payload);
    const forwardDecel = linear ? -linear.x : null;
    if (forwardDecel !== null && forwardDecel >= TELEMETRY_HARSH_BRAKE_DECEL_MS2) {
      out.push({
        ...row,
        eventTypeCode: TelemetryEventTypeCode.HarshBrake,
        severityCode: "WARNING",
        payloadJson: {
          ...(payload ?? {}),
          forwardDecelMs2: forwardDecel,
          magnitudeMs2: magnitude,
        },
      });
    } else if (forwardDecel !== null && forwardDecel <= -TELEMETRY_HARSH_ACCEL_MS2) {
      out.push({
        ...row,
        eventTypeCode: TelemetryEventTypeCode.HarshAcceleration,
        severityCode: "WARNING",
        payloadJson: {
          ...(payload ?? {}),
          forwardAccelMs2: -forwardDecel,
          magnitudeMs2: magnitude,
        },
      });
    } else if (magnitude >= TELEMETRY_COLLISION_ACCEL_MS2) {
      out.push({
        ...row,
        eventTypeCode: TelemetryEventTypeCode.CollisionSuspected,
        severityCode: "CRITICAL",
        payloadJson: { ...(payload ?? {}), magnitudeMs2: magnitude },
      });
    }
    const gyro = this.readVec3(payload, "gyroRadS");
    if (
      gyro &&
      Math.hypot(gyro.x, gyro.y, gyro.z) > 2.5 &&
      (event.speedKmh ?? 0) >= TELEMETRY_SHARP_TURN_MIN_SPEED_KMH
    ) {
      out.push({
        ...row,
        eventTypeCode: TelemetryEventTypeCode.SharpTurn,
        severityCode: "WARNING",
        payloadJson: {
          ...(payload ?? {}),
          gyroMagnitudeRadS: Math.hypot(gyro.x, gyro.y, gyro.z),
          source: "GYRO",
        },
      });
    }
    return out;
  }

  private static deriveSharpTurn(
    event: IngestEventInput,
    tripId: string | null,
    state: InterpreterState,
    speed: number | null,
    recordedMs: number,
  ): DerivedTelemetryEvent[] {
    const heading = event.headingDegrees;
    if (
      heading === undefined ||
      speed === null ||
      speed < TELEMETRY_SHARP_TURN_MIN_SPEED_KMH
    ) {
      return [];
    }
    const prev = state.lastHeadingDeg;
    const prevAt = state.lastHeadingAtMs;
    state.lastHeadingDeg = heading;
    state.lastHeadingAtMs = recordedMs;
    if (prev === undefined || prevAt === undefined) {
      return [];
    }
    const dt = recordedMs - prevAt;
    if (dt <= 0 || dt > TELEMETRY_SHARP_TURN_WINDOW_MS) {
      return [];
    }
    const delta = this.headingDeltaDegrees(prev, heading);
    if (delta < TELEMETRY_SHARP_TURN_HEADING_DELTA_DEG) {
      return [];
    }
    const row = this.toDerived(event, tripId, event.payload ?? null);
    return [
      {
        ...row,
        eventTypeCode: TelemetryEventTypeCode.SharpTurn,
        severityCode: "WARNING",
        payloadJson: {
          headingDeltaDegrees: delta,
          speedKmh: speed,
          source: "HEADING",
        },
      },
    ];
  }

  private static trackIdleAndEngine(
    event: IngestEventInput,
    tripId: string | null,
    state: InterpreterState,
    speed: number,
    recordedMs: number,
    row: DerivedTelemetryEvent,
  ): DerivedTelemetryEvent[] {
    const out: DerivedTelemetryEvent[] = [];
    const nearlyStopped = speed <= TELEMETRY_IDLE_SPEED_KMH;
    if (!nearlyStopped) {
      if (state.idleActive) {
        out.push({
          ...row,
          eventTypeCode: TelemetryEventTypeCode.IdleEnd,
          tripCorrelationId: tripId,
          severityCode: "INFO",
          payloadJson: { autoDetected: true },
        });
        state.idleActive = false;
      }
      state.stopSinceMs = undefined;
      state.engineIdleSinceMs = undefined;
      state.engineIdleEmitted = false;
      return out;
    }
    if (state.stopSinceMs === undefined) {
      state.stopSinceMs = recordedMs;
    }
    const stopSeconds = (recordedMs - state.stopSinceMs) / 1000;
    if (
      !state.idleActive &&
      stopSeconds >= TELEMETRY_IDLE_START_SECONDS
    ) {
      state.idleActive = true;
      out.push({
        ...row,
        eventTypeCode: TelemetryEventTypeCode.IdleStart,
        tripCorrelationId: tripId,
        severityCode: "INFO",
        payloadJson: {
          autoDetected: true,
          idleSeconds: Math.floor(stopSeconds),
          longIdle: stopSeconds >= TELEMETRY_LONG_IDLE_SECONDS,
        },
      });
    }
    if (state.engineIdleSinceMs === undefined) {
      state.engineIdleSinceMs = recordedMs;
    }
    const engineSeconds = (recordedMs - state.engineIdleSinceMs) / 1000;
    if (
      !state.engineIdleEmitted &&
      engineSeconds >= TELEMETRY_ENGINE_IDLE_SUSPECT_SECONDS
    ) {
      state.engineIdleEmitted = true;
      out.push({
        ...row,
        eventTypeCode: TelemetryEventTypeCode.EngineIdleSuspected,
        tripCorrelationId: tripId,
        severityCode: "INFO",
        payloadJson: {
          speedKmh: speed,
          durationSeconds: Math.floor(engineSeconds),
          obdRpmVerified: false,
        },
      });
    }
    return out;
  }

  private static maybeSpeedExceeded(
    event: IngestEventInput,
    tripId: string | null,
    state: InterpreterState,
    speed: number,
    row: DerivedTelemetryEvent,
  ): DerivedTelemetryEvent[] {
    const limit =
      this.readNumber(event.payload, "speedLimitKmh") ??
      TELEMETRY_DEFAULT_SPEED_LIMIT_KMH;
    if (speed <= limit) {
      return [];
    }
    const now = event.recordedAt.getTime();
    if (
      state.lastSpeedExceededEmitMs !== undefined &&
      now - state.lastSpeedExceededEmitMs < TELEMETRY_SPEED_EXCEEDED_COOLDOWN_MS
    ) {
      return [];
    }
    state.lastSpeedExceededEmitMs = now;
    return [
      {
        ...row,
        eventTypeCode: TelemetryEventTypeCode.SpeedExceeded,
        tripCorrelationId: tripId,
        severityCode: "WARNING",
        payloadJson: {
          speedKmh: speed,
          thresholdKmh: limit,
          speedSourceCode: event.speedSourceCode ?? event.payload?.speedSourceCode,
        },
      },
    ];
  }

  private static stopDurationSeconds(
    state: InterpreterState,
    recordedMs: number,
  ): number | null {
    if (state.stopSinceMs === undefined) {
      return null;
    }
    return Math.floor((recordedMs - state.stopSinceMs) / 1000);
  }

  private static clearStopTimers(state: InterpreterState): void {
    state.stopSinceMs = undefined;
    state.idleActive = false;
    state.engineIdleSinceMs = undefined;
    state.engineIdleEmitted = false;
  }

  private static headingDeltaDegrees(a: number, b: number): number {
    const diff = Math.abs(((b - a + 540) % 360) - 180);
    return diff;
  }

  private static readVec3(
    payload: Record<string, unknown> | null,
    key: string,
  ): { x: number; y: number; z: number } | null {
    if (!payload) {
      return null;
    }
    const raw = payload[key];
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const obj = raw as Record<string, unknown>;
    const x = this.readNumber(obj, "x");
    const y = this.readNumber(obj, "y");
    const z = this.readNumber(obj, "z");
    if (x === null || y === null || z === null) {
      return null;
    }
    return { x, y, z };
  }

  private static readNumber(
    obj: Record<string, unknown> | undefined | null,
    key: string,
  ): number | null {
    if (!obj) {
      return null;
    }
    const value = obj[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  private static resolveSeverity(
    eventTypeCode: string,
  ): "INFO" | "WARNING" | "CRITICAL" | null {
    if (
      eventTypeCode === TelemetryEventTypeCode.CollisionSuspected
    ) {
      return "CRITICAL";
    }
    if (
      eventTypeCode === TelemetryEventTypeCode.PhoneDistractionSuspected
    ) {
      return "WARNING";
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
      eventTypeCode === TelemetryEventTypeCode.LocationSample ||
      eventTypeCode === TelemetryEventTypeCode.MotionSample ||
      eventTypeCode === TelemetryEventTypeCode.EngineIdleSuspected ||
      eventTypeCode === TelemetryEventTypeCode.IdleStart ||
      eventTypeCode === TelemetryEventTypeCode.IdleEnd
    ) {
      return "INFO";
    }
    return null;
  }

  private static toDerived(
    event: IngestEventInput,
    tripId: string | null,
    payload: Record<string, unknown> | null,
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
      payloadJson: payload,
    };
  }
}
