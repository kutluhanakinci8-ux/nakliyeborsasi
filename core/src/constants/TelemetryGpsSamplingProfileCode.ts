/** Companion / native sampling targets (Faz D). */
export enum TelemetryGpsSamplingProfileCode {
  /** Web companion: browser-driven, ~0.2–1 Hz. */
  WebCompanion = "WEB_COMPANION",
  /** Native iOS/Android background target 1–3 Hz. */
  NativeHighFrequency = "NATIVE_HIGH_FREQUENCY",
}

export const TELEMETRY_NATIVE_GPS_MIN_HZ = 1;
export const TELEMETRY_NATIVE_GPS_MAX_HZ = 3;
export const TELEMETRY_WEB_COMPANION_FLUSH_MS = 2000;
/** Trigger async matcher after ingest batches of this size (Faz D). */
export const TELEMETRY_ROUTE_REBUILD_EVERY_N_SAMPLES = 10;
