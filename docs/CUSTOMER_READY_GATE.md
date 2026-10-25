# Müşteri sunumu — hazırlık kapısı

Bu belge, QA raporunda **atlanan / CONFIG_LATER** maddelerin operasyon ve otomasyon karşılığını listeler.

## Otomatik kapı (CI / agent)

```bash
npm run customer-ready
```

Katmanlar: premium QA suite, npm audit gate (`tar` override + isteğe bağlı `NPM_AUDIT_ALLOW_NEXT_CRITICAL=1`), OWASP baseline, EN Playwright, k6/autocannon profili.

## VPS — zorunlu ops (canlı müşteri)

Sunucuda (`/var/www/nakliyeborsasi`):

1. **Deploy** — son `main` + `bash scripts/deploy-posta-lerta-com-tr.sh`
2. **API güvenlik başlıkları (nginx)** — `bash scripts/nginx-yonetim-lerta-com-tr.sh` (HSTS artık yonetim HTTPS bloğunda)
3. **OAuth** — `bash scripts/verify-uat-oauth-env.sh` (Google + Microsoft client secret)
4. **Push VAPID** — `.env` içinde mail + messaging VAPID; `verify-mail-web-push-prod.sh`
5. **PTR / deliverability** — `docs/MAIL_PTR_RUNBOOK.md`
6. **IMAP gold** — `bash scripts/smoke-imap-gold.sh` (Thunderbird UAT)
7. **Billing prod** — `OPERATOR_JWT` ile `run-mail-billing-a1-acceptance.sh`

Ortam değişkenleri örneği:

```bash
export ENV_FILE=/var/www/nakliyeborsasi/.env
export OPERATOR_JWT='…'
export MAIL_JMAP_JWT='…'
export MAIL_INBOUND_PTR_SOFT=1
bash scripts/run-mail-messaging-parity-close-checklist.sh
```

## Pentest / sertifikasyon

- **OWASP baseline** (`scripts/qa-owasp-baseline.sh`) — sürekli smoke
- **Tam sızma** — üçüncü taraf pentest (ISO 27001 / SOC2 Type II ayrı proje)

## ISO/IEC/IEEE 29119

Test katmanları `scripts/run-lerta-premium-qa-suite.sh` çıktısı ve `docs/reports/LERTA_QA_MASTER_REPORT_*.md` ile izlenebilir.
