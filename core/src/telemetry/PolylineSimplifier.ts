import { haversineDistanceMeters, type LatLng } from "./GeoMath";

/**
 * Ramer–Douglas–Peucker simplification for GPS polylines (Faz A).
 */
export class PolylineSimplifier {
  public static simplify(
    points: readonly LatLng[],
    toleranceMeters: number,
  ): LatLng[] {
    if (points.length <= 2) {
      return [...points];
    }
    const keep = new Set<number>([0, points.length - 1]);
    this.recurse(points, 0, points.length - 1, toleranceMeters, keep);
    return [...keep]
      .sort((a, b) => a - b)
      .map((index) => points[index]);
  }

  private static recurse(
    points: readonly LatLng[],
    start: number,
    end: number,
    toleranceMeters: number,
    keep: Set<number>,
  ): void {
    if (end <= start + 1) {
      return;
    }
    let maxDistance = 0;
    let index = start;
    const lineStart = points[start];
    const lineEnd = points[end];
    for (let i = start + 1; i < end; i += 1) {
      const distance = this.perpendicularDistanceMeters(
        points[i],
        lineStart,
        lineEnd,
      );
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }
    if (maxDistance > toleranceMeters) {
      keep.add(index);
      this.recurse(points, start, index, toleranceMeters, keep);
      this.recurse(points, index, end, toleranceMeters, keep);
    }
  }

  private static perpendicularDistanceMeters(
    point: LatLng,
    lineStart: LatLng,
    lineEnd: LatLng,
  ): number {
    const lineLength = haversineDistanceMeters(lineStart, lineEnd);
    if (lineLength < 1) {
      return haversineDistanceMeters(point, lineStart);
    }
    const latMid = (lineStart.latitude + lineEnd.latitude) / 2;
    const x = point.longitude;
    const y = point.latitude;
    const x1 = lineStart.longitude;
    const y1 = lineStart.latitude;
    const x2 = lineEnd.longitude;
    const y2 = lineEnd.latitude;
    const cos = Math.cos((latMid * Math.PI) / 180);
    const ax = (x - x1) * cos;
    const ay = y - y1;
    const bx = (x2 - x1) * cos;
    const by = y2 - y1;
    const t = Math.max(0, Math.min(1, (ax * bx + ay * by) / (bx * bx + by * by)));
    const projX = x1 + (x2 - x1) * t;
    const projY = y1 + (y2 - y1) * t;
    return haversineDistanceMeters(point, {
      latitude: projY,
      longitude: projX,
    });
  }
}
