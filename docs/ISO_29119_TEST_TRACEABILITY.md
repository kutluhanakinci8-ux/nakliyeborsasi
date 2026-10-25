# ISO/IEC/IEEE 29119 — test izlenebilirlik matrisi (Lerta)

Bu belge **sertifikasyon** değildir; otomatik kapılar ve manuel UAT/pentest adımlarını 29119 süreç diline map eder.

| 29119 alanı | Lerta karşılığı | Kanıt |
|-------------|-----------------|--------|
| Test politikası | `docs/SECURITY_SOC2_LITE_OVERVIEW.md`, MP-9 | `verify-security-compliance-mp9.sh` |
| Test planı | `docs/LERTA_QA_GAP_CLOSURE_PLAN.md` | Master QA raporu |
| Test tasarımı | Vitest spec, Playwright e2e | `apps/api/src/**/*.spec.ts`, `apps/mail-web/e2e/` |
| Test yürütme | Premium QA suite | `run-lerta-premium-qa-suite.sh` |
| Test raporlama | JSON + MD | `docs/reports/LERTA_QA_MASTER_REPORT_*.json` |
| Risk tabanlı test | Parity checklist, prelaunch gate | `run-mail-messaging-parity-*.sh` |

| Test seviyesi | Komut |
|---------------|--------|
| Bileşen | `npm run test:unit` |
| Entegrasyon | `npm run test:integration` |
| Sistem | `npm run test:mail-e2e`, `verify-posta-https.sh` |
| Kabul (UAT) | `verify-uat-faz6-code-complete.sh` · ops: `UAT_VPS_RUNTIME=1` |

Güncelleme: her `run-lerta-premium-qa-suite.sh` koşusunda rapor tarihi ile birlikte saklanır.
