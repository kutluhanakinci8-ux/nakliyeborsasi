/** Kinematics speed provenance (native OBD hook in later faz). */
export const TelemetrySpeedSourceCode = {
  Gps: "GPS",
  Obd: "OBD",
  Fused: "FUSED",
} as const;

export type TelemetrySpeedSourceCode =
  (typeof TelemetrySpeedSourceCode)[keyof typeof TelemetrySpeedSourceCode];
