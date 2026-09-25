# Lerta Mail — ödeme (Stripe / iyzico)

## Ortam değişkenleri (VPS `.env`)

| Değişken | Açıklama |
|----------|----------|
| `MAIL_BILLING_PROVIDER` | `stripe` (varsayılan) veya `iyzico` |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` test modu) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `STRIPE_MAIL_CORPORATE_PRICE_ID` | Kurumsal plan subscription price id |
| `STRIPE_MAIL_ENTERPRISE_PRICE_ID` | Enterprise plan subscription price id |
| `MAIL_CONSOLE_PUBLIC_URL` | Örn. `https://yonetim.lerta.com.tr` |
| `MAIL_API_PUBLIC_URL` | Örn. `https://yonetim.lerta.com.tr/api/v1` (iyzico callback için) |
| `IYZICO_API_KEY` / `IYZICO_SECRET_KEY` | iyzico sandbox veya canlı |
| `IYZICO_BASE_URL` | Varsayılan `https://sandbox-api.iyzipay.com` |
| `IYZICO_CORPORATE_PRICE_TRY` | Checkout tutarı (örn. `490.00`) |
| `IYZICO_ENTERPRISE_PRICE_TRY` | Enterprise checkout (örn. `1490.00`) |
| `IYZICO_CALLBACK_URL` | Opsiyonel; varsayılan `{MAIL_API_PUBLIC_URL}/webhooks/mail-billing/iyzico` |
| `IYZICO_CHECKOUT_PAGE_URL` | API anahtarı yoksa: harici ödeme sayfası base URL |
| `MAIL_BILLING_GRACE_DAYS` | Ödeme başarısız sonrası Kurumsal ek süre (varsayılan `7`) |

## API

- `GET /api/v1/company/mail-billing/status` (JWT) → yapılandırma özeti (test modu, webhook, iyzico callback URL)
- `POST /api/v1/company/mail-billing/checkout/corporate` (JWT) → `{ url, provider }`
- `POST /api/v1/company/mail-billing/checkout/enterprise` (JWT) → Enterprise plan
- `GET /api/v1/company/mail-billing/lifecycle` (JWT) → abonelik durumu / grace
- `POST /api/v1/company/mail-billing/cancel` (JWT, owner/billing admin) → dönem sonu iptal veya manuel pilot düşüş
- `POST /api/v1/company/mail-billing/resume` (JWT) → Stripe `cancel_at_period_end` kaldırma
- `POST /api/v1/webhooks/mail-billing/stripe` (Stripe imzası, raw body)
- `POST` veya `GET /api/v1/webhooks/mail-billing/iyzico` — iyzico `token` → plan aktivasyonu, ardından konsola yönlendirme

Başarılı ödeme → metadata `planCode` ile `lerta_mail_corporate_tr` veya `lerta_mail_enterprise_tr` atanır.

Vitrin fiyatları (EUR + TRY): `GET /api/v1/subscriptions/mail-plans` — katalog ile iyzico tutarları uyumlu tutun (A7).

## Doğrulama

```bash
./scripts/verify-mail-billing-config.sh
MAIL_BILLING_JWT='<yonetim JWT>' ./scripts/verify-mail-billing-config.sh
```

## Stripe Dashboard

Webhook endpoint: `https://yonetim.lerta.com.tr/api/v1/webhooks/mail-billing/stripe`  
Olaylar: `checkout.session.completed`, `invoice.paid`

Test checkout: konsolda **Öde ve Kurumsal’a geç** → Stripe test kartı → `dashboard?billing=success`.

## iyzico

1. Sandbox API anahtarlarını `.env` içine ekleyin, `MAIL_BILLING_PROVIDER=iyzico`.
2. Panelde callback URL: `https://yonetim.lerta.com.tr/api/v1/webhooks/mail-billing/iyzico`
3. Ödeme sonrası iyzico `token` gönderir; API `retrieveCheckoutForm` ile doğrular ve kurumsal planı açar.

API anahtarı tanımlı değilse eski davranış: `IYZICO_CHECKOUT_PAGE_URL` + `organizationId` query.
