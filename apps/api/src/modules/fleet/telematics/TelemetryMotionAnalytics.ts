import { FleetMotionPhase } from "@nakliyeborsasi/core";

const STOP_SPEED_KMH = 8;
const ACCEL_DELTA_KMH = 6;

export type SpeedSample = {
  recordedAt: Date;
  speedKmh: number | null;
};

export class TelemetryMotionAnalytics {
  public static deriveMotionPhase(samples: readonly SpeedSample[]): FleetMotionPhase {
    if (samples.length === 0) {
      return "UNKNOWN";
    }
    const latestSpeed = samples[samples.length - 1].speedKmh ?? 0;
    if (latestSpeed <= STOP_SPEED_KMH) {
      return "STOPPED";
    }
    if (samples.length < 2) {
      return "MOVING";
    }
    const previousSpeed = samples[samples.length - 2].speedKmh ?? latestSpeed;
    const delta = latestSpeed - previousSpeed;
    if (delta >= ACCEL_DELTA_KMH) {
      return "ACCELERATING";
    }
    if (delta <= -ACCEL_DELTA_KMH) {
      return "DECELERATING";
    }
    return "MOVING";
  }
}
