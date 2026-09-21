# Uygulama fazları (sıra)

| Faz | Durum | İçerik |
|-----|--------|--------|
| 1 | Tamamlandı | PostgreSQL + TypeORM, ilan, abonelik, audit log |
| 2 | Tamamlandı | JWT auth, şirket rolleri, korumalı API |
| 3 | İskelet | Next.js web (`apps/web`), Expo mobile (`apps/mobile`) |
| 4 | Tamamlandı (API) | Redis cache + dakikalık rate limit (entegrasyon araması) |
| 5 | İskelet | `auction`, `messaging`, `trust-scores` modül uçları + `core` tipleri |

## Demo hesap (seed)

- E-posta: `demo@nakliyeborsasi.local`
- Şifre: `DemoPass123!`
- Plan: `carrier_professional_tr_ua`

## Sonraki işler

- Faz 3: Web/mobile auth akışı, tasarım sistemi, push bildirim
- Faz 5: İhale entity, mesajlaşma WebSocket, güven skoru hesaplama
