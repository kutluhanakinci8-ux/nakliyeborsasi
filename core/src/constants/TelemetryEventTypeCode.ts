export const TelemetryEventTypeCode = {
  LocationSample: "LOCATION_SAMPLE",
  TripStart: "TRIP_START",
  TripEnd: "TRIP_END",
  StopDetected: "STOP_DETECTED",
  IdleStart: "IDLE_START",
  IdleEnd: "IDLE_END",
  SpeedExceeded: "SPEED_EXCEEDED",
  HarshBrake: "HARSH_BRAKE",
  HarshAcceleration: "HARSH_ACCELERATION",
  SharpTurn: "SHARP_TURN",
  CollisionSuspected: "COLLISION_SUSPECTED",
  /** IMU batch: accel, gyro, magnetometer / compass backup. */
  MotionSample: "MOTION_SAMPLE",
  /** GPS hız ≈0, OBD RPM yok — yakıt/rölanti ipucu. */
  EngineIdleSuspected: "ENGINE_IDLE_SUSPECTED",
  /** Native distraction SDK; ayrı rıza gerekir. */
  PhoneDistractionSuspected: "PHONE_DISTRACTION_SUSPECTED",
  DeviceHeartbeat: "DEVICE_HEARTBEAT",
} as const;

export type TelemetryEventTypeCode =
  (typeof TelemetryEventTypeCode)[keyof typeof TelemetryEventTypeCode];
