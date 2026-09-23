import { Repository } from "typeorm";
import {
  LOGISTICS_POI_DATASET_VERSION,
  LogisticsPoiKindCode,
  LogisticsPoiSourceCode,
} from "@nakliyeborsasi/core";
import { LogisticsPoiEntity } from "../entities/LogisticsPoiEntity";

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const TURKEY_OVERPASS_QUERY = `
[out:json][timeout:180];
area["ISO3166-1"="TR"][admin_level=2]->.tr;
(
  node["amenity"="weighbridge"](area.tr);
  way["amenity"="weighbridge"](area.tr);
  node["amenity"="truck_stop"](area.tr);
  way["amenity"="truck_stop"](area.tr);
  node["parking"="truck"](area.tr);
  way["parking"="truck"](area.tr);
);
out center;
`;

function resolveKind(tags: Record<string, string> | undefined): LogisticsPoiKindCode | null {
  if (!tags) {
    return null;
  }
  if (tags.amenity === "weighbridge" || tags.weighbridge === "yes") {
    return LogisticsPoiKindCode.WeighStation;
  }
  if (
    tags.amenity === "truck_stop" ||
    tags.parking === "truck" ||
    tags.hgv === "yes"
  ) {
    return LogisticsPoiKindCode.TruckParking;
  }
  return null;
}

function resolveName(tags: Record<string, string> | undefined, kind: LogisticsPoiKindCode): string {
  const name =
    tags?.name ??
    tags?.["name:tr"] ??
    tags?.operator ??
    tags?.brand;
  if (name) {
    return name.slice(0, 250);
  }
  return kind === LogisticsPoiKindCode.WeighStation ? "Kantar" : "Tır parkı";
}

export async function seedLogisticsPoiFromTurkeyOverpass(
  repository: Repository<LogisticsPoiEntity>,
): Promise<{ inserted: number; skipped: number }> {
  const existing = await repository.count();
  if (existing > 0) {
    return { inserted: 0, skipped: 0 };
  }

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Accept: "application/json",
    },
    body: new URLSearchParams({ data: TURKEY_OVERPASS_QUERY }).toString(),
  });
  if (!response.ok) {
    throw new Error(`Overpass HTTP ${response.status}`);
  }
  const payload = (await response.json()) as { elements?: OverpassElement[] };
  const elements = payload.elements ?? [];
  let inserted = 0;
  let skipped = 0;
  for (const element of elements) {
    const kind = resolveKind(element.tags);
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (!kind || lat === undefined || lon === undefined) {
      skipped += 1;
      continue;
    }
    const externalId = `${element.type}/${element.id}`;
    try {
      await repository.save(
        repository.create({
          kindCode: kind,
          displayName: resolveName(element.tags, kind),
          latitude: lat,
          longitude: lon,
          countryCode: "TR",
          sourceCode: LogisticsPoiSourceCode.OpenStreetMap,
          externalId,
          datasetVersion: LOGISTICS_POI_DATASET_VERSION,
          metadataJson: element.tags ?? null,
        }),
      );
      inserted += 1;
    } catch {
      skipped += 1;
    }
  }
  return { inserted, skipped };
}

/** Minimal fallback when Overpass is unavailable (dev / CI). */
export async function seedLogisticsPoiCorridorSample(
  repository: Repository<LogisticsPoiEntity>,
): Promise<void> {
  const count = await repository.count();
  if (count > 0) {
    return;
  }
  const samples: Array<{
    kind: LogisticsPoiKindCode;
    name: string;
    lat: number;
    lng: number;
    externalId: string;
  }> = [
    {
      kind: LogisticsPoiKindCode.WeighStation,
      name: "Kantar (örnek — Polatlı)",
      lat: 39.5842,
      lng: 32.1638,
      externalId: "sample/weigh-polatli",
    },
    {
      kind: LogisticsPoiKindCode.TruckParking,
      name: "Tır parkı (örnek — Konya)",
      lat: 37.9521,
      lng: 32.6184,
      externalId: "sample/park-konya",
    },
    {
      kind: LogisticsPoiKindCode.WeighStation,
      name: "Kantar (örnek — Burdur)",
      lat: 37.0182,
      lng: 30.7125,
      externalId: "sample/weigh-burdur",
    },
  ];
  for (const sample of samples) {
    await repository.save(
      repository.create({
        kindCode: sample.kind,
        displayName: sample.name,
        latitude: sample.lat,
        longitude: sample.lng,
        countryCode: "TR",
        sourceCode: LogisticsPoiSourceCode.Curated,
        externalId: sample.externalId,
        datasetVersion: LOGISTICS_POI_DATASET_VERSION,
        metadataJson: { sample: true },
      }),
    );
  }
}
