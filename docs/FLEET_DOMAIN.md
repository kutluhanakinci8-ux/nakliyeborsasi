# Fleet domain (carrier · driver · vehicle)

## Model

- **Company** (`LOAD_CARRIER` / `LOAD_SEEKER` with `FLEET` entitlement) owns all fleet rows.
- **Fleet driver** — operational person; optional future link to `user_accounts` for driver app login.
- **Fleet vehicle** — registered asset (country + normalized plate, VIN, equipment, payload).
- **Assignment** — time-bounded history (`validFrom` / `validTo`); active pair mirrored on driver and vehicle for fast UI.

## API (`/api/v1/fleet`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/overview` | Drivers, vehicles, counts |
| POST | `/drivers` | Create driver |
| PATCH | `/drivers/:id` | Update driver |
| POST | `/drivers/:id/unassign` | Clear active vehicle |
| POST | `/vehicles` | Create vehicle |
| PATCH | `/vehicles/:id` | Update vehicle |
| POST | `/assignments` | Assign driver ↔ vehicle (closes prior open rows) |

## Web

`/hesap/filo` — carrier self-service for drivers, trucks, and pairing.

## Dispatch links

- `freight_listings.assignedFleetVehicleId` / `assignedFleetDriverId` — kapasite veya yük ilanı
- `auction_sessions.assignedFleetVehicleId` / `assignedFleetDriverId` / `fleetOperatorCompanyId` — ihale operasyonu
- `POST /fleet/listings/:id/assign-fleet`, `POST /fleet/auctions/:id/assign-fleet`

## Driver portal

- `fleet_drivers.linkedUserAccountId` + membership `FLEET_DRIVER`
- `POST /fleet/drivers/:id/link-user`
- `GET /fleet/driver-portal/me` — şoförün atanan ilan/ihaleleri

## Admin

- `GET /platform-admin/companies` includes `driverCount` and `vehicleCount` per firma

## Telematics (driver phone)

See **`docs/TELEMATICS_ARCHITECTURE.md`**.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/fleet/telematics/driver/status` | Consent + device + recent events |
| POST | `/fleet/telematics/driver/consent` | Grant tracking consent |
| POST | `/fleet/telematics/driver/consent/revoke` | Revoke consent |
| POST | `/fleet/telematics/driver/devices/enroll` | Register device (one-time ingest token) |
| POST | `/fleet/telematics/ingest/batch` | Device batch upload (`X-NB-Device-Token`) |

Web: `/sofor/telemetri`, companion `/sofor/telemetri/cihaz`.

## Extension points

- Subcontractor carriers (parent `companyId` + `operatingCompanyId`)
- EU mobility package / license expiry on driver
- Telematics `externalReference` on vehicle
- Dispatch: link assignment to `freight_listing` or auction win
