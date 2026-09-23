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

## Extension points

- Subcontractor carriers (parent `companyId` + `operatingCompanyId`)
- EU mobility package / license expiry on driver
- Telematics `externalReference` on vehicle
- Dispatch: link assignment to `freight_listing` or auction win
