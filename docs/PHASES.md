# Uygulama fazları (sıra)

| Faz | Durum | İçerik |
|-----|--------|--------|
| 1 | Tamamlandı | PostgreSQL + TypeORM, ilan, abonelik, audit log |
| 2 | Tamamlandı | JWT auth, şirket rolleri, korumalı API |
| 3 | Devam ediyor | Next.js web (`apps/web` :3011), Expo mobile iskelet |
| 4 | Tamamlandı (API) | Redis cache + dakikalık rate limit (entegrasyon araması) |
| 5 | Tamamlandı (MVP) | İhale + mesajlaşma + güven skoru REST API, statik panel (`/panel/`) |
| 5.1 | Tamamlandı | İhale kapanışı, kazanan teklif, firma ID kopyala (panel + web oturum) |
| 6 | Planlı | Operasyon: nginx/SSL, domain, OpenAPI, izleme |
| 7 | Planlı | Ürün derinliği: filo ilanı, lane analytics UI, kayıtlı arama + bildirim |
| 8 | Planlı | Canlı mesaj (WebSocket), ödeme/faktoring hook |

## Demo hesaplar (seed)

| E-posta | Şifre | Plan |
|---------|--------|------|
| `demo@nakliyeborsasi.local` | `DemoPass123!` | `carrier_professional_tr_ua` |
| `partner@nakliyeborsasi.local` | `DemoPass123!` | `carrier_professional_tr_ua` |

Panel: `http://168.231.109.27:3010/panel/` · Web: port `3011` (VPS’te PM2 ile ayrı süreç)

## Önerilen sıra (sıradaki işler)

1. **Faz 3 — Web:** build doğrulama, ihale/mesaj ekranları, VPS’te `restart-web.sh`
2. **Faz 3 — Mobil:** Expo login + ilan listesi + push iskeleti
3. **Faz 6 — Yayın:** nginx reverse proxy, HTTPS, tek domain
4. **Entegrasyonlar:** Gerçek partner API anahtarları; `CONTACTS` modülü
5. **Faz 7:** Filo, lane analytics, kayıtlı arama
6. **Faz 8:** WebSocket mesaj bildirimi
