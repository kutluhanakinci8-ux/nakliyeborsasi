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
    await new Promise((resolve) => setTimeout(resolve, 12_000));
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

/** OSM snapshot (central TR bbox) when live Overpass is rate-limited. */
const BOOTSTRAP_OSM_NODES: readonly OverpassElement[] = [
  {
    type: "node",
    id: 5803865444,
    lat: 38.7727079,
    lon: 33.1733988,
    tags: { amenity: "weighbridge", name: "KANTAR" },
  },
  {
    type: "node",
    id: 9285009658,
    lat: 38.4182325,
    lon: 31.6075499,
    tags: { amenity: "weighbridge", name: "Kantar" },
  },
  {
    type: "node",
    id: 9466522015,
    lat: 39.2609864,
    lon: 32.0271891,
    tags: { amenity: "weighbridge" },
  },
  {
    type: "node",
    id: 9509071727,
    lat: 39.7140749,
    lon: 32.8144143,
    tags: { amenity: "weighbridge" },
  },
  {
    type: "node",
    id: 9509071749,
    lat: 39.7131152,
    lon: 32.8153565,
    tags: { amenity: "weighbridge" },
  },
  {
    type: "node",
    id: 9705631469,
    lat: 39.8119587,
    lon: 32.5556999,
    tags: { amenity: "weighbridge" },
  },
  {
    type: "node",
    id: 10226489549,
    lat: 39.9615147,
    lon: 32.8333631,
    tags: { amenity: "weighbridge" },
  },
  {
    type: "node",
    id: 11176648255,
    lat: 38.1289013,
    lon: 33.0700605,
    tags: { amenity: "weighbridge", maxweight: "60" },
  },
  {
    type: "node",
    id: 11465842116,
    lat: 36.5748722,
    lon: 30.5496019,
    tags: { amenity: "weighbridge", name: "Kantar" },
  },
];

async function persistElements(
  repository: Repository<LogisticsPoiEntity>,
  elements: readonly OverpassElement[],
): Promise<number> {
  let inserted = 0;
  for (const element of elements) {
    const kind = resolveKind(element.tags);
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (!kind || lat === undefined || lon === undefined) {
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
      // duplicate externalId
    }
  }
  return inserted;
}

/** Fallback bootstrap (real OSM coords, bundled). */
export async function seedLogisticsPoiCorridorSample(
  repository: Repository<LogisticsPoiEntity>,
): Promise<void> {
  const count = await repository.count();
  if (count > 0) {
    return;
  }
  await persistElements(repository, BOOTSTRAP_OSM_NODES);
}
