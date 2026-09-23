# Telematics Faz E — phone sensors parity

Capability matrix (web companion vs native vs fleet value):

| Signal | Web companion | Native iOS/Android | Fleet value | Faz E status |
|--------|---------------|--------------------|-------------|--------------|
| Rakım (`altitudeMeters`) | `coords.altitude` when available | Yes | Mountain pass, pressure validation | Ingest + live pin |
| Dikey doğruluk | `verticalAccuracyMeters` | Yes | GPS reliability | Ingest + payload |
| Hız kaynağı | `GPS` | GPS + OBD | Speed limit / evidence | `TelemetrySpeedSourceCode`; OBD later |
| 1–3 Hz iz | ~2 Hz timer + `watchPosition` | Background 1–3 Hz | Route match, weigh scale distance | `WEB_COMPANION` profile |
| İvme (x,y,z) | `DeviceMotion` → `MOTION_SAMPLE` | Core Motion / SensorManager | Harsh brake, collision | Server derives events |
| Jiroskop | `rotationRate` in payload | Yes | Sharp turn, rollover | Gyro + heading rules |
| Manyetometre / pusula | `deviceorientation` alpha | Yes | Heading backup | Payload `magnetometerHeadingDegrees` |
| Uzun durma (idle) | GPS speed + duration | Yes | Demurrage | `IDLE_START` / `IDLE_END`, `longIdle` |
| Rölanti | GPS 0 km/h timer | OBD RPM | Fuel | `ENGINE_IDLE_SUSPECTED` (OBD TBD) |
| Hız limiti | Payload `speedLimitKmh` or default 90 | Map + GPS | Safety score | `SPEED_EXCEEDED` + cooldown |
| Sert viraj | Heading delta + gyro | IMU | Trailer / fragile load | `SHARP_TURN` |
| Telefon kullanımı | Not on web | Native SDK | Safety (sensitive) | `PHONE_DISTRACTION_SUSPECTED` + `DRIVER_DISTRACTION_ANALYTICS` consent |
| Çarpışma / darbe | IMU magnitude | IMU + GPS stop | Emergency | `COLLISION_SUSPECTED` from `MOTION_SAMPLE` |

## Ingest

Top-level optional fields on each event (batch DTO):

- `altitudeMeters`, `verticalAccuracyMeters`, `speedSourceCode`

Event types: see `TelemetryEventTypeCode` in core.

`PHONE_DISTRACTION_SUSPECTED` is **dropped** unless payload includes `distractionConsentGranted: true` or `consentPurposes` contains `DRIVER_DISTRACTION_ANALYTICS`.

Device row `interpreterStateJson` persists idle/heading debounce across batches.

## Native app (next)

- Sampling profile `NATIVE_HIGH_FREQUENCY` (1–3 Hz).
- Background location + Core Motion batches as `MOTION_SAMPLE`.
- OBD: set `speedSourceCode: OBD` and optional `engineRpm` in payload.
- Distraction: separate UI consent → enroll purpose + ingest flag.

## Consent version

Bump `TELEMETRY_CONSENT_DOCUMENT_VERSION` to `2026-09-23-global-v2` when re-granting after adding distraction purpose.
