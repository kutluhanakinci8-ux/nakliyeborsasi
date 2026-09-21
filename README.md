# Nakliye Borsası

Modüler yük borsası platformu — TR ve UA–EU koridoru, çoklu dil (`tr`, `en`, `uk`, `ru`), modüler abonelik ve harici kaynak entegrasyonları (Lardi-Trans, Della, DAT, Truckstop, sennder, Freightos).

## Yapı

| Paket | Açıklama |
|-------|----------|
| `core/` | Domain tipleri, exception’lar, port arayüzleri |
| `apps/api/` | NestJS HTTP API |

## Kurulum

```bash
npm install
cp .env.example .env
npm run build
npm run start
```

## API (özet)

- `GET /api/v1/health`
- `GET /api/v1/subscriptions/plans?lang=tr`
- `GET /api/v1/marketplace/listings`
- `POST /api/v1/marketplace/listings`
- `GET /api/v1/integrations/freight-offers` — `x-company-id` (varsayılan: `demo-company-001`), **EXTERNAL_FEEDS** modülü gerekir

Dil: `Accept-Language` veya `?lang=uk`

Harici API URL’leri `.env` içinde; boş bırakılan sağlayıcılar demo normalize edilmiş kayıt döner (Freightos public calculator canlı denenebilir).

## Kod ilkeleri

- Dosya başına tek sınıf
- Satır içi yorum yok
- Ortak tipler `core/`
- Özel exception sınıfları

Detay: `docs/MVP_SCOPE.md`, `docs/ARCHITECTURE.md`
