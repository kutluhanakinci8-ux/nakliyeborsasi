# QA gap kapanış — otomasyon tamamlandı

**Son STRICT kapı:** `QA_CLOSURE_STRICT=1 npm run qa:closure` (VPS, müşteri-ready dahil).

## Tek komut özeti

| Komut | Açıç |
|--------|------|
| `npm run qa:closure` | Faz 7–9b |
| `QA_CLOSURE_STRICT=1 npm run qa:closure` | + `customer-ready` STRICT |
| `npm run qa:faz9b` | İmza öncesi manuel adımlar (MD) |
| `STRICT_CUSTOMER_READY=1 npm run customer-ready` | Sadece müşteri kapısı |

## Kanıt dosyaları (VPS `docs/reports/`)

- `QA_GAP_CLOSURE_FINAL_<tarih>.json`
- `LERTA_QA_MASTER_REPORT_<tarih>.json`
- `CUSTOMER_READY_GATE_<tarih>.md`
- `FAZ7_PENTEST_<tarih>.json` · `ZAP_PASSIVE_*.json`
- `FAZ8_COMPLIANCE_<tarih>.json`
- `UAT_FAZ9_SIGNOFF_<tarih>.json`
- `UAT_FAZ9B_ASSIST_<tarih>.md`

## Hâlâ insan / harici firma

1. **9c** — Müşteri imzası (Thunderbird, Apple Mail, M9 teslimat) → `UAT_*_SIGNED=1`
2. **7b** — Pentest firması → `PENTEST_EXTERNAL_CHECKLIST.md`
3. **8b** — SOC2 Type II / ISO 27001 denetçisi
4. **M4** (isteğe bağlı) — `GOOGLE_CALENDAR_*` + `docs/MAIL_GOOGLE_CALENDAR.md`

Tam plan: `docs/LERTA_QA_GAP_CLOSURE_PLAN.md`
