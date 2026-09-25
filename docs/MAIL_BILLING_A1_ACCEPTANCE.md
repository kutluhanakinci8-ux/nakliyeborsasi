# Faz A1 — Stripe test checkout kabul kriterleri

**Amaç:** Müşteri yönetim konsolundan Kurumsal plan için test modunda ödeme yapabilsin; webhook sonrası plan otomatik açılsın.

## Otomatik checklist (API)

`GET /api/v1/platform-admin/mail/billing-health` (platform operatör JWT)

Yanıt:

- `status` — mevcut `company/mail-billing/status` ile aynı şekil
- `a1.ready` — tüm maddeler yeşil ve `blockers` boş
- `a1.checklist` — adım adım (test key, price, webhook, checkout)

Konsol: **Operatör → Ödeme altyapısı (Faz A1)** kartı.

## VPS script

```bash
# .env doğrulama (VPS'te veya ENV_FILE ile)
./scripts/verify-mail-billing-config.sh

# Operatör JWT ile canlı API
OPERATOR_JWT='eyJ…' ./scripts/run-mail-billing-a1-acceptance.sh

# Checkout URL üretimi dahil
OPERATOR_JWT='eyJ…' RUN_CHECKOUT_SMOKE=1 ./scripts/run-mail-billing-a1-acceptance.sh
```

Anahtarları uzaktan yazmak için: `scripts/apply-mail-billing-env-vps.sh` (`VPS_SSH_PASSWORD` + Stripe test env).

## Stripe Dashboard

[MAIL_BILLING_STRIPE_SETUP.md](./MAIL_BILLING_STRIPE_SETUP.md)

## Manuel uçtan uca

1. Pilot veya test organizasyon → **Yükselt / Öde ve Kurumsal'a geç**
2. Stripe test kartı `4242 4242 4242 4242`
3. Dönüş `dashboard?billing=success`
4. Plan **lerta_mail_corporate_tr**; operatör KPI / tenant listesinde görünür

## A1 tamam sayılması

| # | Kriter |
|---|--------|
| 1 | `a1.ready === true` (canlı API) |
| 2 | En az bir test checkout tamamlandı |
| 3 | Webhook `checkout.session.completed` veya `invoice.paid` işlendi (plan güncellendi) |

Canlı (A2) için: [MAIL_BILLING_PRODUCTION_CUTOVER.md](./MAIL_BILLING_PRODUCTION_CUTOVER.md)
