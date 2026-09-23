/** Shared motion / idle thresholds (web companion + native). */

export const TELEMETRY_STOP_SPEED_KMH = 8;
export const TELEMETRY_IDLE_SPEED_KMH = 5;
/** Bekleme / demurrage: durak sayımı başlangıcı. */
export const TELEMETRY_IDLE_START_SECONDS = 3 * 60;
/** Uzun durma — payload `longIdle: true`. */
export const TELEMETRY_LONG_IDLE_SECONDS = 15 * 60;
/** Rölanti (motor açık varsayımı; OBD RPM ile doğrulanacak). */
export const TELEMETRY_ENGINE_IDLE_SUSPECT_SECONDS = 2 * 60;
export const TELEMETRY_DEFAULT_SPEED_LIMIT_KMH = 90;
export const TELEMETRY_SPEED_EXCEEDED_COOLDOWN_MS = 60_000;
export const TELEMETRY_SHARP_TURN_MIN_SPEED_KMH = 25;
export const TELEMETRY_SHARP_TURN_HEADING_DELTA_DEG = 45;
export const TELEMETRY_SHARP_TURN_WINDOW_MS = 4_000;
export const TELEMETRY_HARSH_BRAKE_DECEL_MS2 = 9;
export const TELEMETRY_HARSH_ACCEL_MS2 = 7;
export const TELEMETRY_COLLISION_ACCEL_MS2 = 35;
