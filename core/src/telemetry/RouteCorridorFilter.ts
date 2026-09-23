import { haversineDistanceMeters, type LatLng } from "./GeoMath";
import type { GeoJsonLineString } from "../types/GeoJsonTypes";

export type CorridorCandidate = LatLng & {
  id: string;
};

export type CorridorMatch<T extends CorridorCandidate> = T & {
  distanceToRouteMeters: number;
  distanceFromStartMeters: number;
};

/**
 * Keeps POIs within `corridorMeters` of a matched road polyline.
 */
export class RouteCorridorFilter {
  public static filterAlongRoute<T extends CorridorCandidate>(
    geometry: GeoJsonLineString,
    candidates: readonly T[],
    corridorMeters: number,
    maxResults: number,
  ): CorridorMatch<T>[] {
    const path = this.normalizePath(geometry);
    if (path.length < 2 || candidates.length === 0) {
      return [];
    }
    const cumulative = this.cumulativeDistances(path);
    const matches: CorridorMatch<T>[] = [];
    for (const candidate of candidates) {
      const projection = this.projectOntoPath(candidate, path, cumulative);
      if (projection.distanceToRouteMeters > corridorMeters) {
        continue;
      }
      matches.push({
        ...candidate,
        distanceToRouteMeters: projection.distanceToRouteMeters,
        distanceFromStartMeters: projection.distanceFromStartMeters,
      });
    }
    matches.sort(
      (a, b) => a.distanceFromStartMeters - b.distanceFromStartMeters,
    );
    return matches.slice(0, maxResults);
  }

  public static boundingBox(
    geometry: GeoJsonLineString,
    paddingMeters: number,
  ): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;
    for (const position of geometry.coordinates) {
      const lng = position[0];
      const lat = position[1];
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
    const padDeg = paddingMeters / 111_000;
    return {
      minLat: minLat - padDeg,
      maxLat: maxLat + padDeg,
      minLng: minLng - padDeg,
      maxLng: maxLng + padDeg,
    };
  }

  private static normalizePath(geometry: GeoJsonLineString): LatLng[] {
    return geometry.coordinates.map((position) => ({
      latitude: position[1],
      longitude: position[0],
    }));
  }

  private static cumulativeDistances(path: readonly LatLng[]): number[] {
    const distances = [0];
    for (let index = 1; index < path.length; index += 1) {
      distances.push(
        distances[index - 1] +
          haversineDistanceMeters(path[index - 1], path[index]),
      );
    }
    return distances;
  }

  private static projectOntoPath(
    point: LatLng,
    path: readonly LatLng[],
    cumulative: readonly number[],
  ): { distanceToRouteMeters: number; distanceFromStartMeters: number } {
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestFromStart = 0;
    for (let index = 1; index < path.length; index += 1) {
      const start = path[index - 1];
      const end = path[index];
      const segmentLength = haversineDistanceMeters(start, end);
      if (segmentLength < 0.5) {
        const dist = haversineDistanceMeters(point, start);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestFromStart = cumulative[index - 1];
        }
        continue;
      }
      const projection = this.projectOnSegment(point, start, end);
      const distanceToRoute = haversineDistanceMeters(point, projection);
      const fromStart =
        cumulative[index - 1] +
        haversineDistanceMeters(start, projection);
      if (distanceToRoute < bestDistance) {
        bestDistance = distanceToRoute;
        bestFromStart = fromStart;
      }
    }
    return {
      distanceToRouteMeters: bestDistance,
      distanceFromStartMeters: bestFromStart,
    };
  }

  private static projectOnSegment(
    point: LatLng,
    start: LatLng,
    end: LatLng,
  ): LatLng {
    const latMid = (start.latitude + end.latitude) / 2;
    const cos = Math.cos((latMid * Math.PI) / 180);
    const ax = (point.longitude - start.longitude) * cos;
    const ay = point.latitude - start.latitude;
    const bx = (end.longitude - start.longitude) * cos;
    const by = end.latitude - start.latitude;
    const denom = bx * bx + by * by;
    const t = denom > 0 ? Math.max(0, Math.min(1, (ax * bx + ay * by) / denom)) : 0;
    return {
      latitude: start.latitude + (end.latitude - start.latitude) * t,
      longitude: start.longitude + (end.longitude - start.longitude) * t,
    };
  }
}
