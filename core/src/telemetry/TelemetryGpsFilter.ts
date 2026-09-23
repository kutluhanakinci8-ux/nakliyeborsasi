import { haversineDistanceMeters, type LatLng } from "./GeoMath";

export type GpsSampleInput = LatLng & {
  recordedAt: Date | string;
  speedKmh?: number | null;
  horizontalAccuracyMeters?: number | null;
};

export type TelemetryGpsFilterOptions = {
  /** Exclude samples with accuracy worse than this (meters). */
  maxAccuracyMeters: number;
  /** Exclude stationary noise when building route (km/h). */
  minSpeedKmhForRoute: number;
  /** Reject jumps faster than this (m/s). */
  maxJumpSpeedMps: number;
};

export const DEFAULT_TELEMETRY_GPS_FILTER: TelemetryGpsFilterOptions = {
  maxAccuracyMeters: 80,
  minSpeedKmhForRoute: 3,
  maxJumpSpeedMps: 555,
};

function toMs(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/**
 * Filters GPS breadcrumbs for route reconstruction (Faz A).
 */
export class TelemetryGpsFilter {
  public static filterForRoute(
    samples: readonly GpsSampleInput[],
    options: TelemetryGpsFilterOptions = DEFAULT_TELEMETRY_GPS_FILTER,
  ): GpsSampleInput[] {
    if (samples.length === 0) {
      return [];
    }
    const sorted = [...samples].sort(
      (a, b) => toMs(a.recordedAt) - toMs(b.recordedAt),
    );
    const kept: GpsSampleInput[] = [];
    for (const sample of sorted) {
      if (
        sample.horizontalAccuracyMeters !== null &&
        sample.horizontalAccuracyMeters !== undefined &&
        sample.horizontalAccuracyMeters > options.maxAccuracyMeters
      ) {
        continue;
      }
      const speed = sample.speedKmh ?? 0;
      if (speed < options.minSpeedKmhForRoute && kept.length > 0) {
        const last = kept[kept.length - 1];
        const lastSpeed = last.speedKmh ?? 0;
        if (lastSpeed < options.minSpeedKmhForRoute) {
          continue;
        }
      }
      if (kept.length > 0) {
        const previous = kept[kept.length - 1];
        const dtSec =
          (toMs(sample.recordedAt) - toMs(previous.recordedAt)) / 1000;
        if (dtSec > 0 && dtSec < 3600) {
          const dist = haversineDistanceMeters(previous, sample);
          const impliedMps = dist / dtSec;
          if (impliedMps > options.maxJumpSpeedMps) {
            continue;
          }
        }
      }
      kept.push(sample);
    }
    if (kept.length < 2 && sorted.length >= 2) {
      return [sorted[0], sorted[sorted.length - 1]];
    }
    return kept;
  }
}
