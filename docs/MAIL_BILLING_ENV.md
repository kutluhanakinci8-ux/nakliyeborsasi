# Lerta Mail — ödeme (Stripe / iyzico)

## Ortam değişkenleri (VPS `.env`)

| Değişken | Açıklama |
|----------|----------|
| `MAIL_BILLING_PROVIDER` | `stripe` (varsayılan) veya `iyzico` |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `STRIPE_MAIL_CORPORATE_PRICE_ID` | Kurumsal plan subscription price id |
| `MAIL_CONSOLE_PUBLIC_URL` | Örn. `https://yonetim.lerta.com.tr` |
| `IYZICO_CHECKOUT_PAGE_URL` | iyzico: ödeme sayfası base URL (org id query ile) |

## API

- `POST /api/v1/company/mail-billing/checkout/corporate` (JWT) → `{ url, provider }`
- `POST /api/v1/webhooks/mail-billing/stripe` (Stripe imzası, raw body)

Başarılı ödeme → `lerta_mail_corporate_tr` planı atanır.

## Stripe Dashboard

Webhook endpoint: `https://yonetim.lerta.com.tr/api/v1/webhooks/mail-billing/stripe`  
Olaylar: `checkout.session.completed`, `invoice.paid`

## iyzico

Panelde ödeme sonrası sunucu tarafında `POST company/mail-identity/subscription/select` veya özel callback ile `activateMailPlanForBilling` çağrılmalı (manuel entegrasyon).
