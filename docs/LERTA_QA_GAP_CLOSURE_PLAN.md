# Lerta — QA eksik kapanış planı (faz faz)

**Hedef:** Kurumsal SDLC test kataloğundaki otomasyon boşluklarını repo + VPS ops ile kapatmak.  
**Doğrulama:** `bash scripts/run-lerta-premium-qa-suite.sh` · `npm run customer-ready` · `npm run test:integration`

| Faz | Kapsam | Repo / ops | Durum |
|-----|--------|------------|--------|
| **0** | Kapı hijyeni (`failCount`, M9 unit, müşteri gate SKIP vs FAIL) | Script | Bu PR |
| **1** | Birim + API vitest tam | `test:unit`, `test:api` | Mevcut ✅ |
| **2** | Entegrasyon smoke (canlı API health/ready + modül spec) | `test:integration`, `qa-api-integration-smoke.sh` | Bu PR |
| **3** | Sistem E2E tam mail-web + messaging script | Premium suite full `test:mail-e2e` | Bu PR |
| **4** | Yük + stres profilleri | `qa-load-stress.sh`, `qa-stress-profile.sh`, `qa-k6-profile.sh` | Bu PR (stres: hafif-orta; tam kırılma VPS profili) |
| **5** | L10n gate (hardcoded TR taraması + genişletilmiş URL) | `qa-i18n-mail-web-gate.sh`, `qa-l10n-expanded.sh` | Bu PR |
| **6** | UAT ops | `UAT_VPS_RUNTIME=1`, `.env`, `verify-uat-ops-runtime.sh` | **VPS / secrets** |
| **7** | Pentest tam | Harici firma + `qa-pentest-external-checklist.sh` | **Harici** |
| **8** | ISO 29119 / SOC2 Type II / ISO 27001 / PCI | `docs/ISO_29119_TEST_TRACEABILITY.md` + MP-9 | Dok + denetim |
| **9** | Müşteri imzalı UAT (Thunderbird, teslimat, takvim) | `uat-faz6-sequential.sh`, runbook | **Manuel** |

## VPS’te kapatılacak maddeler (Faz 6–9)

```bash
export ENV_FILE=/var/www/nakliyeborsasi/.env
export OPERATOR_JWT='…'
export UAT_VPS_RUNTIME=1
bash scripts/verify-uat-ops-runtime.sh
bash scripts/uat-faz6-sequential.sh
bash scripts/smoke-imap-gold.sh
npm run customer-ready   # STRICT_CUSTOMER_READY=1 ile SKIP yok
```

## Sertifikasyon (repo dışı)

- Tam kara/gri/beyaz kutu pentest raporu
- SOC 2 Type II, ISO 27001, HIPAA/PCI QSA denetimi

Bu maddeler `scripts/qa-pentest-external-checklist.sh` ile izlenir; otomatik PASS üretmez.
