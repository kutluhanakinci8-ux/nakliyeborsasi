const EARTH_RADIUS_M = 6_371_000;

export type LatLng = { latitude: number; longitude: number };

export function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function lineStringLengthMeters(
  coordinates: readonly GeoJsonPositionLite[],
): number {
  let total = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const prev = coordinates[index - 1];
    const curr = coordinates[index];
    total += haversineDistanceMeters(
      { latitude: prev[1], longitude: prev[0] },
      { latitude: curr[1], longitude: curr[0] },
    );
  }
  return total;
}

export type GeoJsonPositionLite = [number, number];
