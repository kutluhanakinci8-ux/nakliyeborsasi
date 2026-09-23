/** Minimal GeoJSON types for fleet route geometry (RFC 7946). */

export type GeoJsonPosition = [number, number] | [number, number, number];

export type GeoJsonLineString = {
  type: "LineString";
  coordinates: GeoJsonPosition[];
};

export type GeoJsonPoint = {
  type: "Point";
  coordinates: GeoJsonPosition;
};
