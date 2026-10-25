# Faz 6 — kod tamamlama kapısı

Yapılandırma (OAuth, VAPID, PTR, canlı inbox smoke) **sonra**; önce repo kodunun UAT M1–M10 ile hizalı olduğunu doğrular.

## Komut

```bash
bash scripts/verify-uat-faz6-code-complete.sh
```

Rapor: `docs/reports/UAT_FAZ6_CODE_COMPLETE.json`

Tam sıralı koşu (kod + isteğe bağlı VPS):

```bash
bash scripts/uat-faz6-sequential.sh              # yalnız kod (varsayılan)
UAT_VPS_RUNTIME=1 bash scripts/uat-faz6-sequential.sh   # M1/M2/M9 canlı
UAT_DEFER_OAUTH=0 bash scripts/uat-faz6-sequential.sh # OAuth .env kontrolü
```

## Kod scriptleri

| UAT | Script |
|-----|--------|
| M1 | `smoke-imap-gold.sh`, `MailImapMaildirReconcileScheduler.ts` |
| M2 | `verify-uat-m2-outlook-mobile-imap.sh`, `enable-postfix-submission-587.sh` |
| M3/M4 | `verify-uat-m3-m4-calendar-oauth-code.sh` |
| M5 | `verify-uat-m5-ios-pwa-push-code.sh` |
| M6 | `verify-uat-m6-webauthn-code.sh` |
| M7 | `verify-uat-m7-campaign-webhook-code.sh` |
| M8 | `verify-uat-m8-kvkk-compliance-code.sh` |
| M9 | `verify-uat-m9-delivery-code.sh` |
| M10 | `verify-mail-web-pwa-prod.sh` |

## Yapılandırma (sonraki faz)

1. M5 — `apply-mail-web-push-vps-env.sh` (VAPID)
2. M3/M4 — [MAIL_OAUTH_VPS_SETUP.md](./MAIL_OAUTH_VPS_SETUP.md)
3. M9 — PTR Hostinger + pilot inbox §3.3
4. M1/M2 — telefon / Thunderbird manuel imza
