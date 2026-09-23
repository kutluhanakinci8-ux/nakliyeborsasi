import { GeographicMarketCode } from "../constants/GeographicMarketCode";

export type OsrmShardDefinition = {
  marketCode: GeographicMarketCode;
  /** Rough bounding box [minLng, minLat, maxLng, maxLat]. */
  bbox: [number, number, number, number];
};

/** Regional OSRM shards (Faz B/D): TR → UA → EU corridor. */
export const OSRM_SHARD_DEFINITIONS: readonly OsrmShardDefinition[] = [
  {
    marketCode: GeographicMarketCode.Turkey,
    bbox: [25.5, 35.5, 45.0, 42.5],
  },
  {
    marketCode: GeographicMarketCode.Ukraine,
    bbox: [22.0, 44.0, 40.5, 52.5],
  },
  {
    marketCode: GeographicMarketCode.EuropeanUnionCorridor,
    bbox: [-10.0, 35.0, 40.0, 72.0],
  },
];

export function resolveOsrmShard(longitude: number, latitude: number): GeographicMarketCode {
  for (const shard of OSRM_SHARD_DEFINITIONS) {
    const [minLng, minLat, maxLng, maxLat] = shard.bbox;
    if (
      longitude >= minLng &&
      longitude <= maxLng &&
      latitude >= minLat &&
      latitude <= maxLat
    ) {
      return shard.marketCode;
    }
  }
  return GeographicMarketCode.EuropeanUnionCorridor;
}
