# Faz A — Stripe / iyzico canlı geçiş (A2, A3)

Kod hazır; üretim anahtarları ve Dashboard yapılandırması operasyon adımlarıdır.

## Ön koşul

- [ ] Test modunda `smoke-mail-billing-stripe.sh` ve konsol checkout başarılı (A1)
- [ ] `verify-mail-billing-config.sh` yeşil (JWT ile checkout URL testi)

## Stripe canlı (A2)

1. Dashboard → **Live mode** → Products / Prices (Kurumsal + Enterprise) — env’deki `STRIPE_MAIL_*_PRICE_ID` ile eşleşsin.
2. `.env`: `STRIPE_SECRET_KEY=sk_live_…`, `STRIPE_WEBHOOK_SECRET=whsec_…` (live endpoint).
3. Webhook: `https://yonetim.lerta.com.tr/api/v1/webhooks/mail-billing/stripe`  
   Olaylar: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted` (grace/iptal için).
4. API restart; operatör konsolunda billing status **live** görünümünü doğrula.
5. Tek gerçek düşük tutarlı ödeme + iptal testi (iade politikasına uygun).

## iyzico canlı (A3)

1. `IYZICO_BASE_URL=https://api.iyzipay.com`
2. Canlı API key/secret; `IYZICO_CORPORATE_PRICE_TRY` / `IYZICO_ENTERPRISE_PRICE_TRY` katalog TRY ile uyumlu (A7).
3. Panel callback: `…/webhooks/mail-billing/iyzico`
4. `MAIL_BILLING_PROVIDER=iyzico` veya müşteri bazlı strateji (tek provider VPS’te).

## İzleme

- Stripe webhook hata logları + operatör KPI
- `MAIL_BILLING_GRACE_DAYS` — başarısız ödeme sonrası grace

Referans: [MAIL_BILLING_ENV.md](./MAIL_BILLING_ENV.md), [MAIL_VPS_DEPLOY_RUNBOOK.md](./MAIL_VPS_DEPLOY_RUNBOOK.md)
