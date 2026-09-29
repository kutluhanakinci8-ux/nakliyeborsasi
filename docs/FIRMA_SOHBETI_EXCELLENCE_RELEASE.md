# Firma sohbeti Excellence (FS-8 … FS-12) — sürüm notu

**Tarih:** 2026-09-29 · **Ortam:** `app.lerta.com.tr` · **Git:** `main` (#158–#162 paket, #162 birleşik merge)

## Özet

B2B firma sohbetinde günlük kullanım sürtünmesini azaltma, kurumsal kalite, premium UX, operasyon hızı ve kanal entegrasyonu — tek Excellence paketi.

## FS-8 — Sürtünme + prod

- Firma adıyla arama (`GET /messaging/companies/search`)
- Hub varsayılan sekme (`GET/PATCH /messaging/hub-default`)
- Birleşik arama UI (sohbet + firma kartı)

## FS-9 — Kurumsal kalite

- Kullanıcı bazlı okundu (✓✓) + kim okudu
- Grup sohbet UI (3+ firma)
- Düzenle/sil modalları, @mention vurgusu, iç not filtresi

## FS-10 — Premium UX + mobil

- Sürükle-bırak ek, gün ayırıcı, avatar, alıntılı yanıt
- Arama → mesaja scroll, iş bağlamı şeridi, mobil tam ekran thread
- Modal focus trap, mention klavye

## FS-11 — Operasyon hızı

- İşlem damgaları (Onaylandı / Reddedildi / Görüldü)
- Org şablon CRUD, compose kısayolları (`/`, `@`, Esc)

## FS-12 — Kanal ve mağaza

- WA bildirim köprüsü + KVKK onayı + **Kanallar** paneli
- Grup katılımcı rolleri, `message.stamped` webhook, partner stamp API
- Capacitor stub + `docs/MESSAGING_FS12_CHANNELS.md`

## Deploy / doğrulama

```bash
bash scripts/apply-messaging-fs8-schema.sh
bash scripts/apply-messaging-fs11-schema.sh
bash scripts/apply-messaging-fs12-schema.sh
bash scripts/verify-firma-sohbeti-fs8-prod-checklist.sh
bash scripts/verify-firma-sohbeti-fs8.sh … fs12.sh
```

## Pilot NPS

5 pilot firma için: `docs/FIRMA_SOHBETI_PILOT_NPS.md`

## Ops kapanış (FS-8 prod)

- `MESSAGING_SSE_REDIS_FANOUT=1` + `verify-messaging-sse-redis-fanout.sh`
- `scripts/apply-messaging-prod-ops-env.sh` — `MESSAGING_SSE_INSTANCE_ID`
- Auth smoke: `.env` içinde `MESSAGING_TEST_EMAIL` / `MESSAGING_TEST_PASSWORD` → `resolve-messaging-test-jwt.sh`
- Hub varsayılan sekme UI: Hesap → Profil → **Mesajlar hub** (firma yöneticisi)
