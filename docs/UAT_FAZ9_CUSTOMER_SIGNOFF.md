# Faz 9 — Müşteri UAT imza protokolü

**Otomasyon öncesi:** Faz 6B (`npm run uat:ops`) ve Faz 8 (`npm run qa:faz8`) PASS olmalı.

## Otomatik kapı (VPS)

```bash
export ENV_FILE=/var/www/nakliyeborsasi/.env
npm run qa:faz9
```

Rapor: `docs/reports/UAT_FAZ9_SIGNOFF_<tarih>.json` + `UAT_FAZ9_SIGNOFF_<tarih>.md`

## Manuel imza maddeleri (müşteri / PO)

| ID | Konu | Otomasyon | İmza |
|----|------|-----------|------|
| **M1-TB** | Thunderbird — IMAP klasörleri + arşiv/çöp senkronu | `smoke-imap-gold.sh` (sunucu) | Müşteri: ad, tarih |
| **M1-AM** | Apple Mail (iOS/macOS) — aynı senaryo | Rehber: `MAIL_IMAP_GOLD_SMOKE.md` | Müşteri: ad, tarih |
| **M9-IN** | MSN / Gmail / Outlook — gelen kutusunda pilot teslimat | `verify-lerta-mail-inbound-p0.sh` (DNS/servis) | Müşteri: ekran görüntüsü veya “gördüm” |
| **M4-GC** | Google Takvim OAuth — canlı bağlantı | `.env` + webmail sihirbazı | İsteğe bağlı imza |

## İmza bloğu (kopyala-yapıştır)

```
Lerta Posta UAT Faz 9 — kabul
Tarih: ____ / ____ / ______
Müşteri yetkili: _________________________
M1 Thunderbird: [ ] Kabul  [ ] Red — not: _______
M1 Apple Mail:    [ ] Kabul  [ ] Red — not: _______
M9 Teslimat:      [ ] Kabul  [ ] Red — not: _______
M4 Google Takvim: [ ] Kabul  [ ] N/A
```

İmzalı PDF/scan: güvenli depoda saklanır (MP-9 retention politikası).
