# Global driver telematics (phone sensors)

## Goals

Collect **location, speed, stops, idle time, and safety-related motion signals** from driver phones for fleet operators on Nakliye Borsası — at a quality level comparable to commercial fleet telematics, while respecting **GDPR (EU)**, **UK GDPR**, **CCPA/CPRA (US)**, and **KVKK (TR)** principles.

## Roles

| Role | Responsibility |
|------|----------------|
| **Fleet operator (carrier)** | Data controller for workforce fleet data; configures retention; receives dashboards |
| **Driver** | Explicit consent for phone sensors; can revoke; uses companion app |
| **Platform (NB)** | Data processor; provides ingestion, storage, audit, regional controls |

## Data categories

1. **Location & kinematics** — GPS/Wi‑Fi/cell fix, speed, heading, accuracy
2. **Trip semantics** — stop detection, idle, trip start/end (derived)
3. **Safety events** — harsh brake/accel, sharp turn, collision *suspect* (derived from motion; not a certified crash detector)
4. **Device metadata** — platform, app version, last seen (no unnecessary PII in event stream)

Phone numbers are stored only on **fleet driver profile** (operational contact), not duplicated in each telemetry row.

## Legal design (baseline)

- **Lawful basis (EU/UK):** Art. 6(1)(b) contract (dispatch/safety for employed drivers) + Art. 6(1)(a) **consent** for motion sensors and optional insurance purposes where required.
- **Transparency:** Versioned consent document (`TELEMETRY_CONSENT_DOCUMENT_VERSION`); purpose list in API.
- **Data minimization:** Batch upload; configurable precision; raw samples default **90 days** retention; safety events **365 days** (constants in API).
- **Rights:** Revoke consent → `trackingEnabled=false`, ingest rejected; export/delete hooks planned at processor level.
- **iOS:** Background location requires native app entitlements (`UIBackgroundModes`, Always permission flow). **Web companion** is for pilot/testing with foreground tracking only.

## System architecture

```
[iPhone native app / Web companion]
        │ HTTPS batch (device token)
        ▼
POST /api/v1/fleet/telematics/ingest/batch
        │
        ▼
TelemetryApplicationService
  ├─ validate consent + token
  ├─ persist FleetTelemetryEvent rows
  ├─ update device last position
  └─ TelemetryMotionInterpreter (stops, harsh events)
        │
        ▼
PostgreSQL (MVP) → future: TimescaleDB / Kafka → cold storage per region
```

Driver enrollment (JWT):

- `GET /fleet/telematics/driver/status`
- `POST /fleet/telematics/driver/consent` — grant
- `POST /fleet/telematics/driver/consent/revoke`
- `POST /fleet/telematics/driver/devices/enroll` — returns **one-time** `ingestToken`

Ingest auth: header `X-NB-Device-Token` + `deviceId` in body (token stored as SHA-256 hash server-side).

## Event model

Standard codes in `@nakliyeborsasi/core` (`TelemetryEventTypeCode`). Payload JSON holds accelerometer peaks, `speedLimitKmh`, `stopDurationSeconds`, etc.

## Pilot test user

- Driver: `kutluhantest-sofor@test.nakliyeborsasi.local`
- Phone (profile): `+905546902543` (iPhone)
- Portal: **`https://168.231.109.27/sofor/telemetri`** (iPhone Safari konumu HTTP `:3011` ile çalışmaz)
- Cihaz companion: `/sofor/telemetri/cihaz` — ilk HTTPS açılışında self-signed sertifikayı onaylayın

## Roadmap (competitive parity)

1. **MVP (this branch)** — API, consent, web companion, stop/speed pipeline
2. **React Native / Swift driver app** — background GPS, Core Motion, push
3. **Carrier map UI** — live fleet on `/hesap/filo`
4. **Regional stacks** — EU data residency, DPA artifacts, tachograph adjacency (not replacement)
5. **OBD / ELD partners** — `externalReference` on vehicles (already in fleet model)
