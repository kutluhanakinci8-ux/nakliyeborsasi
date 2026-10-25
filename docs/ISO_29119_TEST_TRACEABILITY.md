# ISO/IEC/IEEE 29119 — test izlenebilirlik matrisi (Lerta)

Bu belge **sertifikasyon** değildir; otomatik kapılar, raporlar ve manuel UAT/pentest adımlarını 29119 süreç diline map eder. Kanıt indeksi: `docs/COMPLIANCE_EVIDENCE_INDEX.md`.

## Süreç ve dokümantasyon

| 29119 alanı | Lerta karşılığı | Kanıt |
|-------------|-----------------|--------|
| Test politikası | SOC2-lite + MP-9 | `docs/SECURITY_SOC2_LITE_OVERVIEW.md` · `verify-security-compliance-mp9.sh` |
| Test planı | Faz faz kapanış | `docs/LERTA_QA_GAP_CLOSURE_PLAN.md` |
| Test tasarımı | Vitest + Playwright | `apps/api/src/**/*.spec.ts`, `apps/mail-web/e2e/` |
| Test yürütme | Premium QA + faz scriptleri | `run-lerta-premium-qa-suite.sh`, `npm run qa:faz7`, `npm run qa:faz8` |
| Test raporlama | JSON/MD raporlar | `docs/reports/LERTA_QA_MASTER_REPORT_*.json`, `FAZ7_PENTEST_*.json`, `FAZ8_COMPLIANCE_*.json` |
| Risk tabanlı test | Parity + prelaunch | `run-mail-messaging-parity-*.sh` |

## Test seviyeleri

| Seviye | Komut | Son koşu (VPS) |
|--------|--------|----------------|
| Bileşen | `npm run test:unit` | Premium suite |
| Entegrasyon | `npm run test:integration` | Premium suite |
| Sistem | `npm run test:mail-e2e`, `verify-posta-https.sh` | Premium suite |
| Regresyon | Parity close / wave-2 | `customer-ready` STRICT PASS |
| Güvenlik | OWASP + ZAP | `npm run qa:faz7` |
| Kabul (UAT) | `npm run uat:faz6` / `uat:ops` | Faz 6B PASS |
| Müşteri kapısı | `STRICT_CUSTOMER_READY=1 npm run customer-ready` | PASS (25.10.2026) |

## Harici sertifikasyon (29119 dışı çerçeveler)

| Çerçeve | Repo durumu |
|---------|-------------|
| SOC 2 Type II | MP-9 lite dok; Type II denetim **harici** |
| ISO 27001 | ISMS denetimi **harici** |
| PCI-DSS / HIPAA | Checklist maddesi 7 — kapsam bağlı |

Güncelleme: `npm run qa:faz8` her koşuda `FAZ8_COMPLIANCE_<tarih>.json` üretir.
