# Stripe test — Lerta Mail Kurumsal checkout

## 1. Stripe Dashboard (test modu)

1. [Stripe Dashboard](https://dashboard.stripe.com/test/products) → **Products** → Kurumsal abonelik ürünü (ör. aylık EUR).
2. **Price ID** kopyala (`price_…`) → `STRIPE_MAIL_CORPORATE_PRICE_ID`.
3. **Developers → API keys** → Secret key `sk_test_…` → `STRIPE_SECRET_KEY`.

## 2. Webhook

- URL: `https://yonetim.lerta.com.tr/api/v1/webhooks/mail-billing/stripe`
- Olaylar: `checkout.session.completed`, `invoice.paid`
- Signing secret → `STRIPE_WEBHOOK_SECRET`

## 3. VPS `.env`

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_MAIL_CORPORATE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
MAIL_BILLING_PROVIDER=stripe
MAIL_CONSOLE_PUBLIC_URL=https://yonetim.lerta.com.tr
MAIL_API_PUBLIC_URL=https://yonetim.lerta.com.tr/api/v1
```

Agent / CI ile:

```bash
STRIPE_SECRET_KEY=sk_test_... STRIPE_MAIL_CORPORATE_PRICE_ID=price_... \
STRIPE_WEBHOOK_SECRET=whsec_... bash scripts/apply-mail-billing-env-vps.sh
```

API yeniden başlar.

## 4. Doğrulama

1. **yonetim** → Operatör → **Ödeme altyapısı** (Stripe API OK, webhook, price id).
2. Firma hesabı → **Öde ve Kurumsal’a geç** → test kart `4242 4242 4242 4242`.
3. Dönüş: `dashboard?billing=success` ve plan **Kurumsal**.

```bash
MAIL_BILLING_JWT='<JWT>' ./scripts/verify-mail-billing-config.sh
```

## 5. iyzico (sıradaki adım)

`docs/MAIL_BILLING_ENV.md` — `MAIL_BILLING_PROVIDER=iyzico` ve sandbox anahtarları.
