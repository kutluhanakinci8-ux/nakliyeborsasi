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

/** Turkey coverage via bbox tiles (Overpass area queries often 406/timeout). */
const TURKEY_BBOX_TILES: readonly [number, number, number, number][] = [
  [36.0, 26.0, 40.0, 30.5],
  [36.0, 30.5, 40.0, 34.5],
  [36.0, 34.5, 40.0, 38.5],
  [36.0, 38.5, 40.0, 45.0],
  [40.0, 26.0, 42.5, 32.0],
  [40.0, 32.0, 42.5, 38.5],
  [40.0, 38.5, 42.5, 45.0],
];

function overpassUrl(): string {
  return (
    process.env.LOGISTICS_POI_OVERPASS_URL ??
    "https://overpass.kumi.systems/api/interpreter"
  );
}

function bboxQuery(
  south: number,
  west: number,
  north: number,
  east: number,
): string {
  return `
[out:json][timeout:120];
(
  node["amenity"="weighbridge"](${south},${west},${north},${east});
  way["amenity"="weighbridge"](${south},${west},${north},${east});
  node["amenity"="truck_stop"](${south},${west},${north},${east});
  way["amenity"="truck_stop"](${south},${west},${north},${east});
  node["parking"="truck"](${south},${west},${north},${east});
  way["parking"="truck"](${south},${west},${north},${east});
);
out center;
`;
}

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

async function fetchOverpassTile(
  south: number,
  west: number,
  north: number,
  east: number,
): Promise<OverpassElement[]> {
  const response = await fetch(overpassUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: new URLSearchParams({
      data: bboxQuery(south, west, north, east),
    }).toString(),
  });
  if (!response.ok) {
    throw new Error(`Overpass HTTP ${response.status} tile ${south},${west}`);
  }
  const payload = (await response.json()) as { elements?: OverpassElement[] };
  return payload.elements ?? [];
}

export async function seedLogisticsPoiFromTurkeyOverpass(
  repository: Repository<LogisticsPoiEntity>,
): Promise<{ inserted: number; skipped: number }> {
  const existing = await repository.count();
  if (existing > 0) {
    return { inserted: 0, skipped: 0 };
  }

  let inserted = 0;
  let skipped = 0;
  const seen = new Set<string>();

  for (const [south, west, north, east] of TURKEY_BBOX_TILES) {
    const elements = await fetchOverpassTile(south, west, north, east);
    for (const element of elements) {
      const kind = resolveKind(element.tags);
      const lat = element.lat ?? element.center?.lat;
      const lon = element.lon ?? element.center?.lon;
      if (!kind || lat === undefined || lon === undefined) {
        skipped += 1;
        continue;
      }
      const externalId = `${element.type}/${element.id}`;
      if (seen.has(externalId)) {
        continue;
      }
      seen.add(externalId);
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
