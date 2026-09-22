# Uygulama fazları (sıra)

| Faz | Durum | İçerik |
|-----|--------|--------|
| 1 | Tamamlandı | PostgreSQL + TypeORM, ilan, abonelik, audit log |
| 2 | Tamamlandı | JWT auth, şirket rolleri, korumalı API |
| 3.1 | Tamamlandı | Web fonksiyon: giriş, ilan, ihale, mesaj, güven, entegrasyon |
| **3.2** | **Devam ediyor** | Web shell: sidebar, sayfa route’ları, tasarım sistemi v1 |
| 3.3 | Planlı | Expo mobil (login + ilan + push iskeleti) |
| 4 | Tamamlandı (API) | Redis cache + rate limit (entegrasyon) |
| 5 | Tamamlandı (MVP) | İhale + mesaj + güven API + statik `/panel/` |
| 5.1 | Tamamlandı | İhale kapanışı, kazanan, firma ID |
| 6 | Planlı | nginx/SSL, domain, OpenAPI |
| 7 | Planlı | Filo, lane analytics, kayıtlı arama |
| 8 | Planlı | WebSocket mesaj, ödeme hook |

## Demo hesaplar (seed)

| E-posta | Şifre | Plan |
|---------|--------|------|
| `demo@nakliyeborsasi.local` | `DemoPass123!` | `carrier_professional_tr_ua` |
| `partner@nakliyeborsasi.local` | `DemoPass123!` | `carrier_professional_tr_ua` |
| `admin@nakliyeborsasi.local` | `AdminPass123!` | `carrier_professional_tr_ua` (platform yönetimi) |

Panel: `:3010/panel/` · Web: `:3011`

## Önerilen sıra

1. **Faz 3.2 — Web tasarım & sayfa yapısı** ← önyüz burada
2. Faz 3.3 — Mobil
3. Faz 6 — nginx + HTTPS
4. Entegrasyonlar (gerçek API anahtarları, CONTACTS)
5. Faz 7–8 — Filo, bildirim, WebSocket
