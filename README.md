# Nakliye Borsası

Modüler yük borsası platformu — TR ve UA–EU koridoru, çoklu dil (`tr`, `en`, `uk`, `ru`), modüler abonelik ve harici kaynak entegrasyonları.

## Yapı

| Paket | Açıklama |
|-------|----------|
| `core/` | Domain tipleri, exception’lar, port arayüzleri |
| `apps/api/` | NestJS HTTP API (PostgreSQL, Redis, JWT) |
| `apps/web/` | Next.js panel iskeleti |
| `apps/mobile/` | Expo React Native iskeleti |

## Kurulum

```bash
docker compose up -d
npm install
cp .env.example .env
npm run build
npm run start
```

Web (opsiyonel): `npm run dev -w @nakliyeborsasi/web`

## Auth

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"emailAddress":"demo@nakliyeborsasi.local","password":"DemoPass123!"}'
```

Korumalı uçlar: `Authorization: Bearer <token>`

Demo seed hesabı: `docs/PHASES.md`

## API (özet)

- `POST /api/v1/auth/register` · `POST /api/v1/auth/login`
- `GET /api/v1/subscriptions/plans?lang=tr`
- `GET|POST /api/v1/marketplace/listings` (JWT)
- `GET /api/v1/integrations/freight-offers` (JWT + **EXTERNAL_FEEDS**)
- `GET /api/v1/auctions/status` · `messaging` · `trust-scores` (iskelet)

## Kod ilkeleri

- Dosya başına tek sınıf, satır içi yorum yok, ortak tipler `core/`

Detay: `docs/MVP_SCOPE.md`, `docs/ARCHITECTURE.md`, `docs/PHASES.md`
