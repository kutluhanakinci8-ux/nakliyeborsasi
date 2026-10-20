# Parite Faz 21 — P0 faturalama (test → canlı)

## Doğrulama

```bash
bash scripts/run-mail-billing-p0-cutover.sh
```

- Adım 1: `verify-mail-billing-config.sh` (sandbox/test anahtarları)
- Adım 2: `verify-mail-billing-prod.sh` (`sk_live_*`, prod iyzico)

## Konsol

Dashboard plan kartında **Stripe/iyzico · test/canlı** ve `productionReady` / `sandboxReady` özet satırı.

## Canlı geçiş

`docs/MAIL_BILLING_PRODUCTION_CUTOVER.md` · VPS: `bash scripts/apply-mail-billing-env-vps.sh`
