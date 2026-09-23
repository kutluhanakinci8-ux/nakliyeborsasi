# Güzergâh POI — kantar ve tır parkı

## Akış

```
logistics_poi (OSM snapshot + kürasyon)
        │
        ▼
RouteCorridorFilter (roadGeometry + 1 km koridor)
        │
        ▼
GET .../route?poi=weigh_station,truck_parking → routePois
        │
        ▼
FleetLiveMapCanvas (turuncu kantar, mor tır parkı)
```

## Tablo

`logistics_poi` — `kindCode`, `displayName`, `latitude`, `longitude`, `sourceCode`, `externalId`, `datasetVersion`.

## Seed

| Ortam değişkeni | Davranış |
|-----------------|----------|
| (varsayılan) | Tablo boşsa **örnek** 3 POI (Ankara–Antalya koridoru) |
| `LOGISTICS_POI_SEED_OVERPASS=true` | Tablo boşsa **Türkiye OSM** Overpass ingest |
| `LOGISTICS_POI_SKIP_SAMPLE=true` | Örnek seed atlanır |

VPS üretim: bir kez `LOGISTICS_POI_SEED_OVERPASS=true` ile API restart; sonra kaldırın.

## API

`GET /fleet/telematics/carrier/drivers/:driverId/route?poi=weigh_station,truck_parking`

## Sonraki (Faz 2)

- Admin CSV / küratörlü POI
- “Sıradaki kantar” sidebar
- UA/EU POI shard
