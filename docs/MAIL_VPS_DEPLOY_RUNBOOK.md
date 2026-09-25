# Lerta Mail — VPS deploy runbook (stack F3–F5 + B4)

**Hedef VPS örnek:** `168.231.109.27` · yönetim `yonetim.lerta.com.tr`

## 1. Kod merge sırası

GitHub PR zinciri (eskiden yeniye): … → Faz A billing → A5 vitrin → A4 www cutover araçları (bu dal).

Her merge sonrası: `git pull`, API + konsol + vitrin build, PM2/systemd restart.

## 2. Veritabanı (yeni tablolar)

`TYPEORM_SYNCHRONIZE=true` pilot ortamında yeterli; prod’da migration tercih edin.

| Tablo | Özellik |
|-------|---------|
| `mail_organization_branding` | F4 white-label |
| `mail_organization_api_key` | F5 API anahtarları |
| `mail_organization_webhook_endpoint` | F5 webhook |
| `mail_address_alias` / `mail_address_alias_target` | B4 alias |
| `lerta_mail_enterprise_tr` | `scripts/sql/lerta-mail-subscription-plans.sql` |

## 3. Ortam (.env) özeti

| Alan | Değişkenler |
|------|-------------|
| Worker | `LERTA_MAIL_RUNTIME_ROLE=all` (veya api/worker) — [MAIL_MULTI_VPS_SCALE.md](./MAIL_MULTI_VPS_SCALE.md) |
| İzleme | `MAIL_MONITOR_POSTFIX_SHELL`, `MAIL_TLS_CERT_PATHS` — [MAIL_PLATFORM_MONITORING.md](./MAIL_PLATFORM_MONITORING.md) |
| Ödeme | `STRIPE_*`, `STRIPE_MAIL_ENTERPRISE_PRICE_ID`, `IYZICO_*` — [MAIL_BILLING_ENV.md](./MAIL_BILLING_ENV.md) |
| Enterprise | `MAIL_WHITELABEL_*`, `MAIL_PUBLIC_API_*` |

Doğrulama:

```bash
./scripts/verify-mail-billing-config.sh
MAIL_BILLING_JWT='…' ./scripts/smoke-mail-billing-stripe.sh
bash scripts/verify-custom-domain-mail-dns.sh example.com
```

## 4. Servisler

- API: `apps/api` → port 3010 (varsayılan)
- Konsol: `apps/mail-console`
- Webmail: `apps/mail-web`
- Vitrin: `apps/mail-marketing` → `/durum` durum sayfası

Postfix/Dovecot: alias veya yeni sender sonrası inbound sync (`MAIL_INBOUND_APPLY_POSTFIX=true`).

## 5. Smoke kontrol listesi

- [ ] `GET /health` OK
- [ ] `GET public/lerta-mail/status` OK
- [ ] Operatör: KPI + izleme kartları
- [ ] Test tenant: domain DNS, outbox drain, `/integration` (Enterprise)
- [ ] Yedek cron: [MAIL_BACKUP_DISASTER_RECOVERY.md](./MAIL_BACKUP_DISASTER_RECOVERY.md)
