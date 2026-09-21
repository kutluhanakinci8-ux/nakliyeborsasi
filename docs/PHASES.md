# Uygulama fazları (sıra)

| Faz | Durum | İçerik |
|-----|--------|--------|
| 1 | Tamamlandı | PostgreSQL + TypeORM, ilan, abonelik, audit log |
| 2 | Tamamlandı | JWT auth, şirket rolleri, korumalı API |
| 3 | İskelet | Next.js web (`apps/web`), Expo mobile (`apps/mobile`) |
| 4 | Tamamlandı (API) | Redis cache + dakikalık rate limit (entegrasyon araması) |
| 5 | Tamamlandı (MVP) | İhale + mesajlaşma + güven skoru REST API, statik panel (`/panel/`) |
| 6 | Planlı | Operasyon: nginx/SSL, domain, OpenAPI, izleme |
| 7 | Planlı | Ürün derinliği: filo ilanı, lane analytics UI, kayıtlı arama + bildirim |
| 8 | Planlı | Canlı mesaj (WebSocket), ihale kapanışı/kazanan, ödeme/faktoring hook |

## Demo hesaplar (seed)

| E-posta | Şifre | Plan |
|---------|--------|------|
| `demo@nakliyeborsasi.local` | `DemoPass123!` | `carrier_professional_tr_ua` |
| `partner@nakliyeborsasi.local` | `DemoPass123!` | `carrier_professional_tr_ua` |

Panel: `http://168.231.109.27:3010/panel/` (API portu `.env` içindeki `PORT`, örn. 3010)

## Önerilen sıra (sıradaki işler)

1. **Faz 5.1 — İş kuralları:** Süresi dolan ihaleyi otomatik kapatma, en yüksek teklifi kazanan olarak işaretleme; mesaj bildirimi (e-posta veya WebSocket).
2. **Faz 3 — Web:** `apps/web` monorepo build düzeltmesi, giriş, ilan listesi/arama (panel yerine ana ürün arayüzü).
3. **Faz 3 — Mobil:** Expo ile login + ilan listesi + push iskeleti.
4. **Faz 6 — Yayın:** nginx reverse proxy, HTTPS, tek domain (`/api`, `/panel`, web).
5. **Entegrasyonlar:** Gerçek partner API anahtarları; `CONTACTS` modülü ile iletişim gösterimi.
6. **Faz 7:** Boş araç/filo modülü, lane analytics ekranları, kayıtlı arama.
