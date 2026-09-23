import { Injectable } from "@nestjs/common";
import { OsrmRoutingClient } from "./OsrmRoutingClient";

type SnapEntry = {
  latitude: number;
  longitude: number;
  expiresAt: number;
};

@Injectable()
export class LiveSnapCacheService {
  private readonly cache = new Map<string, SnapEntry>();
  private static readonly TTL_MS = 45_000;

  public constructor(private readonly osrmRoutingClient: OsrmRoutingClient) {}

  public async snapDriver(
    driverId: string,
    longitude: number,
    latitude: number,
  ): Promise<{ latitude: number; longitude: number } | null> {
    const now = Date.now();
    const cached = this.cache.get(driverId);
    if (cached && cached.expiresAt > now) {
      return { latitude: cached.latitude, longitude: cached.longitude };
    }
    const snapped = await this.osrmRoutingClient.nearest(longitude, latitude);
    if (!snapped) {
      return null;
    }
    this.cache.set(driverId, {
      latitude: snapped.latitude,
      longitude: snapped.longitude,
      expiresAt: now + LiveSnapCacheService.TTL_MS,
    });
    return snapped;
  }
}
