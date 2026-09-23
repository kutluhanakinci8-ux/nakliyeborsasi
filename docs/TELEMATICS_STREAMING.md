# Telemetri ölçekleme — Faz D (Kafka · shard · native GPS)

## Akış

```
[iOS/Android native 1–3 Hz] ──► ingest API
[Web companion ~0.2–1 Hz]  ──► ingest API
        │
        ▼
 fleet_telemetry_events (PostgreSQL)
        │
        ├──► TelemetryMatchingQueueService
        │         ├── in-process (dev)
        │         ├── Redis list `nb:telemetry:route-matching` (staging)
        │         └── Kafka topic stub (`KAFKA_BROKERS`) → matcher workers
        ▼
 RouteReconstructionService + OSRM shard (TR / UA / UA_EU)
        ▼
 fleet_matched_routes (GeoJSON cache)
```

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|-----------|
| `OSRM_BASE_URL` | Varsayılan OSRM HTTP kökü (demo veya self-host) |
| `OSRM_BASE_URL_TR` | Türkiye shard override |
| `OSRM_BASE_URL_UA` | Ukrayna shard override |
| `OSRM_BASE_URL_UA_EU` | EU koridor shard override |
| `OSRM_DISABLED=true` | Routing kapalı (ham GPS fallback) |
| `REDIS_URL` | Matcher kuyruğu için Redis |
| `KAFKA_BROKERS` | Gelecek matcher worker’ları için broker listesi (şu an log stub) |
| `TELEMETRY_MATCHER_REDIS_QUEUE_KEY` | Redis liste anahtarı (varsayılan `nb:telemetry:route-matching`) |

## Native uygulama

- Hedef örnekleme: **1–3 Hz** (`TELEMETRY_NATIVE_GPS_MIN_HZ` / `MAX` in `@nakliyeborsasi/core`).
- Web companion `maximumAge: 1000` ile daha sık örnek; arka plan için native şart.

## GDPR / KVKK

Self-host OSRM: koordinatlar kendi VPS’inizde işlenir. Üçüncü taraf routing API kullanımında DPA ve rıza metni güncellenmelidir.
