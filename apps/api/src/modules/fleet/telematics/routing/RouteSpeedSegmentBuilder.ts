import type {
  FleetRoutePoint,
  FleetRouteSpeedSegment,
  GeoJsonLineString,
} from "@nakliyeborsasi/core";

/**
 * Builds speed-colored segments along matched road geometry (Faz C).
 */
export class RouteSpeedSegmentBuilder {
  public static build(
    geometry: GeoJsonLineString,
    routePoints: readonly FleetRoutePoint[],
  ): FleetRouteSpeedSegment[] {
    if (geometry.coordinates.length < 2 || routePoints.length < 2) {
      return [];
    }
    const segments: FleetRouteSpeedSegment[] = [];
    for (let index = 1; index < routePoints.length; index += 1) {
      const from = routePoints[index - 1];
      const to = routePoints[index];
      const speedKmh =
        to.speedKmh ?? from.speedKmh ?? 0;
      segments.push({
        coordinates: [
          [from.longitude, from.latitude],
          [to.longitude, to.latitude],
        ],
        speedKmh: Math.max(0, speedKmh),
      });
    }
    if (segments.length === 0 && geometry.coordinates.length >= 2) {
      const coords = geometry.coordinates.map(
        (position) => [position[0], position[1]] as [number, number],
      );
      segments.push({ coordinates: coords, speedKmh: 0 });
    }
    return segments;
  }
}
