# QA FAIL — faz faz kapanış planı

| Faz | Konu | Durum |
|-----|------|--------|
| **1** | API vitest (`vitest.config.ts`, `npm run test:api`) | ✅ Kod |
| **2** | Güvenlik başlıkları (Next + nginx scriptleri) | ✅ Deploy edildi (posta + app HSTS, nosniff) |
| **3** | Regresyon: prod API fallback, PWA proxy lighthouse, SSE | ✅ Script |
| **4** | E2E Playwright install (QA suite içinde) | ✅ Script |
| **5** | npm audit + güvenlik deps | ✅ Posta Next **15.5.28**, WebAuthn **14**; TMS `apps/web` Next 14 → 15 ayrı sprint — [NPM_AUDIT_REMEDIATION.md](./reports/NPM_AUDIT_REMEDIATION.md) |
| **6** | UAT M1–M10 | Manuel |
| **7** | Pentest harici | Manuel |

Doğrulama: `bash scripts/run-lerta-premium-qa-suite.sh`
