# iyzico sandbox — Lerta Mail

## Ortam

```env
MAIL_BILLING_PROVIDER=iyzico
IYZICO_API_KEY=sandbox-...
IYZICO_SECRET_KEY=...
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
IYZICO_CORPORATE_PRICE_TRY=490.00
IYZICO_CALLBACK_URL=https://yonetim.lerta.com.tr/api/v1/webhooks/mail-billing/iyzico
MAIL_API_PUBLIC_URL=https://yonetim.lerta.com.tr/api/v1
MAIL_CONSOLE_PUBLIC_URL=https://yonetim.lerta.com.tr
```

VPS:

```bash
MAIL_BILLING_PROVIDER=iyzico IYZICO_API_KEY=... IYZICO_SECRET_KEY=... \
  bash scripts/apply-mail-billing-env-vps.sh
```

## Akış

1. Konsol → **Öde ve Kurumsal’a geç** → iyzico ödeme sayfası.
2. Sandbox kart ile ödeme.
3. Callback `POST/GET …/webhooks/mail-billing/iyzico?token=…` → plan aktivasyonu → konsola yönlendirme.

## Panel

iyzico merchant panelinde **callback URL** yukarıdaki `IYZICO_CALLBACK_URL` ile aynı olmalı.
