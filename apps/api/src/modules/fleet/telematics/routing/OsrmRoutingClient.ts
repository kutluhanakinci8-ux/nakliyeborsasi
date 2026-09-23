import { Injectable, Logger } from "@nestjs/common";
import {
  type GeoJsonLineString,
  type GeoJsonPosition,
  resolveOsrmShard,
} from "@nakliyeborsasi/core";
import { OsrmConfigurationService } from "./OsrmConfigurationService";

type OsrmRouteResponse = {
  code: string;
  routes?: Array<{
    distance: number;
    geometry: GeoJsonLineString;
  }>;
};

type OsrmMatchResponse = {
  code: string;
  matchings?: Array<{
    distance: number;
    geometry: GeoJsonLineString;
  }>;
};

type OsrmNearestResponse = {
  code: string;
  waypoints?: Array<{
    location: [number, number];
    distance: number;
  }>;
};

export type LatLngSample = {
  latitude: number;
  longitude: number;
};

@Injectable()
export class OsrmRoutingClient {
  private readonly logger = new Logger(OsrmRoutingClient.name);

  public constructor(
    private readonly osrmConfigurationService: OsrmConfigurationService,
  ) {}

  public async nearest(
    longitude: number,
    latitude: number,
  ): Promise<{ longitude: number; latitude: number } | null> {
    if (!this.osrmConfigurationService.isRoutingEnabled()) {
      return null;
    }
    const shard = resolveOsrmShard(longitude, latitude);
    const baseUrl = this.osrmConfigurationService.getShardBaseUrl(shard);
    const url = `${baseUrl}/nearest/v1/driving/${longitude},${latitude}?number=1`;
    const body = await this.fetchJson<OsrmNearestResponse>(url);
    if (body?.code !== "Ok" || !body.waypoints?.length) {
      return null;
    }
    const [lng, lat] = body.waypoints[0].location;
    return { longitude: lng, latitude: lat };
  }

  public async routeBetweenPair(
    from: LatLngSample,
    to: LatLngSample,
  ): Promise<GeoJsonPosition[]> {
    if (!this.osrmConfigurationService.isRoutingEnabled()) {
      return this.fallbackSegment(from, to);
    }
    const midLng = (from.longitude + to.longitude) / 2;
    const midLat = (from.latitude + to.latitude) / 2;
    const shard = resolveOsrmShard(midLng, midLat);
    const baseUrl = this.osrmConfigurationService.getShardBaseUrl(shard);
    const coord = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
    const url = `${baseUrl}/route/v1/driving/${coord}?overview=full&geometries=geojson&steps=false`;
    const body = await this.fetchJson<OsrmRouteResponse>(url);
    if (body?.code !== "Ok" || !body.routes?.[0]?.geometry?.coordinates?.length) {
      return this.fallbackSegment(from, to);
    }
    return body.routes[0].geometry.coordinates;
  }

  public async buildSegmentRoute(
    points: readonly LatLngSample[],
  ): Promise<GeoJsonLineString | null> {
    if (points.length < 2) {
      return null;
    }
    const merged: GeoJsonPosition[] = [];
    const maxPairs =
      this.osrmConfigurationService.getMaxSegmentRoutePairsPerRequest();
    const lastIndex = Math.min(points.length - 1, maxPairs);
    for (let index = 1; index <= lastIndex; index += 1) {
      const segment = await this.routeBetweenPair(
        points[index - 1],
        points[index],
      );
      if (segment.length === 0) {
        continue;
      }
      if (merged.length === 0) {
        merged.push(...segment);
      } else {
        merged.push(...segment.slice(1));
      }
    }
    if (merged.length < 2) {
      return {
        type: "LineString",
        coordinates: points.map((p) => [p.longitude, p.latitude]),
      };
    }
    return { type: "LineString", coordinates: merged };
  }

  public async mapMatch(
    points: readonly LatLngSample[],
  ): Promise<GeoJsonLineString | null> {
    if (points.length < 2 || !this.osrmConfigurationService.isRoutingEnabled()) {
      return null;
    }
    const mid = points[Math.floor(points.length / 2)];
    const shard = resolveOsrmShard(mid.longitude, mid.latitude);
    const baseUrl = this.osrmConfigurationService.getShardBaseUrl(shard);
    const coord = points
      .map((p) => `${p.longitude},${p.latitude}`)
      .join(";");
    const radius = points.map(() => "40").join(";");
    const url = `${baseUrl}/match/v1/driving/${coord}?overview=full&geometries=geojson&radiuses=${radius}&gaps=ignore`;
    const body = await this.fetchJson<OsrmMatchResponse>(url);
    if (body?.code !== "Ok" || !body.matchings?.[0]?.geometry) {
      return null;
    }
    return body.matchings[0].geometry;
  }

  private fallbackSegment(
    from: LatLngSample,
    to: LatLngSample,
  ): GeoJsonPosition[] {
    return [
      [from.longitude, from.latitude],
      [to.longitude, to.latitude],
    ];
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    const timeout = this.osrmConfigurationService.getHttpTimeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        this.logger.warn(`OSRM HTTP ${response.status} for ${url.slice(0, 120)}`);
        return null;
      }
      return (await response.json()) as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : "OSRM error";
      this.logger.debug(`OSRM request failed: ${message}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
