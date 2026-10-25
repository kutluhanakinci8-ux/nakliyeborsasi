# Uyumluluk kanıt indeksi (MP-9 / ISO 29119 hizalı)

Son otomasyon özeti: `docs/reports/FAZ8_COMPLIANCE_<tarih>.json`

## Sürekli kapılar

| Kanıt | Komut |
|--------|--------|
| Master QA | `bash scripts/run-lerta-premium-qa-suite.sh` → `docs/reports/LERTA_QA_MASTER_REPORT_*.json` |
| Müşteri hazırlık | `STRICT_CUSTOMER_READY=1 npm run customer-ready` → `CUSTOMER_READY_GATE_*.md` |
| UAT Faz 6 | `npm run uat:faz6` · `npm run uat:ops` → `UAT_FAZ6_*.json` |
| Pentest otomasyon | `npm run qa:faz7` → `FAZ7_PENTEST_*.json`, `ZAP_PASSIVE_*.json` |
| Uyumluluk Faz 8 | `npm run qa:faz8` → `FAZ8_COMPLIANCE_*.json` |
| Müşteri UAT Faz 9 | `npm run qa:faz9` → `UAT_FAZ9_SIGNOFF_*.json` |
| MP-9 | `bash scripts/verify-security-compliance-mp9.sh` |
| Due diligence paketi | `bash scripts/pack-customer-due-diligence-mp9.sh` → `dist/customer-due-diligence-mp9.zip` |

## Güvenlik dokümantasyonu

- `docs/SECURITY_SOC2_LITE_OVERVIEW.md`
- `docs/SECURITY_INCIDENT_RESPONSE.md`
- `docs/SECURITY_DATA_PROCESSING_INVENTORY.md`
- `docs/SECURITY_AUDIT_RETENTION_EXPORT.md`
- `docs/SECURITY_QUARTERLY_CHECKLIST.md`

## Test izlenebilirlik

- `docs/ISO_29119_TEST_TRACEABILITY.md`
- `docs/LERTA_QA_GAP_CLOSURE_PLAN.md`

## Sertifikasyon (harici)

- `docs/PENTEST_EXTERNAL_CHECKLIST.md` — kara/gri/beyaz kutu, SOC2 Type II, ISO 27001

## ZAP iyileştirme backlog

- `docs/ZAP_WARN_REMEDIATION_BACKLOG.md`
