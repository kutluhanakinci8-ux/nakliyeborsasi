import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, Repository } from "typeorm";
import {
  FleetRoutePoiMarker,
  LogisticsPoiKindCode,
  RouteCorridorFilter,
  type GeoJsonLineString,
} from "@nakliyeborsasi/core";
import { LogisticsPoiEntity } from "../../../../infrastructure/database/entities/LogisticsPoiEntity";

@Injectable()
export class RoutePoiAlongCorridorService {
  private static readonly DEFAULT_CORRIDOR_METERS = 1000;
  private static readonly DEFAULT_MAX_POIS = 80;
  private static readonly BBOX_PADDING_METERS = 1500;

  public constructor(
    @InjectRepository(LogisticsPoiEntity)
    private readonly logisticsPoiRepository: Repository<LogisticsPoiEntity>,
  ) {}

  public async resolveAlongRoute(params: {
    roadGeometry: GeoJsonLineString | null;
    kinds: readonly LogisticsPoiKindCode[];
  }): Promise<FleetRoutePoiMarker[]> {
    if (!params.roadGeometry || params.roadGeometry.coordinates.length < 2) {
      return [];
    }
    if (params.kinds.length === 0) {
      return [];
    }
    const bbox = RouteCorridorFilter.boundingBox(
      params.roadGeometry,
      RoutePoiAlongCorridorService.BBOX_PADDING_METERS,
    );
    const rows = await this.logisticsPoiRepository.find({
      where: {
        kindCode: In(params.kinds),
        latitude: Between(bbox.minLat, bbox.maxLat),
        longitude: Between(bbox.minLng, bbox.maxLng),
      },
      take: 500,
    });
    const matches = RouteCorridorFilter.filterAlongRoute(
      params.roadGeometry,
      rows.map((row) => ({
        id: row.id,
        latitude: row.latitude,
        longitude: row.longitude,
      })),
      RoutePoiAlongCorridorService.DEFAULT_CORRIDOR_METERS,
      RoutePoiAlongCorridorService.DEFAULT_MAX_POIS,
    );
    const rowById = new Map(rows.map((row) => [row.id, row]));
    return matches.map((match) => {
      const row = rowById.get(match.id);
      return {
        poiId: match.id,
        kindCode: row?.kindCode ?? LogisticsPoiKindCode.WeighStation,
        displayName: row?.displayName ?? "POI",
        latitude: match.latitude,
        longitude: match.longitude,
        distanceFromStartKm:
          Math.round((match.distanceFromStartMeters / 1000) * 10) / 10,
        distanceToRouteMeters: Math.round(match.distanceToRouteMeters),
        sourceCode: row?.sourceCode ?? "OSM",
      };
    });
  }

  public parseKindCodes(raw: string | undefined): LogisticsPoiKindCode[] {
    if (!raw?.trim()) {
      return [
        LogisticsPoiKindCode.WeighStation,
        LogisticsPoiKindCode.TruckParking,
      ];
    }
    const tokens = raw.split(",").map((part) => part.trim().toUpperCase());
    const kinds: LogisticsPoiKindCode[] = [];
    for (const token of tokens) {
      if (
        token === "WEIGH_STATION" ||
        token === "KANTAR" ||
        token === "WEIGH"
      ) {
        kinds.push(LogisticsPoiKindCode.WeighStation);
      }
      if (
        token === "TRUCK_PARKING" ||
        token === "TIR" ||
        token === "GARAJ" ||
        token === "TRUCK"
      ) {
        kinds.push(LogisticsPoiKindCode.TruckParking);
      }
    }
    const unique = [...new Set(kinds)];
    return unique.length > 0
      ? unique
      : [
          LogisticsPoiKindCode.WeighStation,
          LogisticsPoiKindCode.TruckParking,
        ];
  }
}
