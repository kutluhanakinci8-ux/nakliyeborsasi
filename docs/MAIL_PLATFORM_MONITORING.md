# Lerta Mail — platform izleme (F1)

## API (operatör)

`GET /api/v1/platform-admin/mail/monitoring`  
Yetki: platform admin JWT.

Yanıt özet alanları:

| Alan | İçerik |
|------|--------|
| `overallStatus` | `ok` \| `warning` \| `critical` \| `unknown` |
| `outbox` | pending/failed, son drain |
| `smtp` | `EmailDeliveryHealthService` doğrulama |
| `postfixQueue` | `mailq` (opsiyonel shell) |
| `disk` | Maildir, yedek, `/` kullanım % |
| `tlsCertificates` | `MAIL_TLS_CERT_PATHS` bitiş tarihi |

Konsol: **Operatör** sayfası — «İzleme (F1)» kartı.

Genel sağlık (load balancer): `GET /health` → `{ status: "ok" }`.

Halka açık durum (F2): `GET /api/v1/public/lerta-mail/status` — [MAIL_PUBLIC_STATUS_PAGE.md](./MAIL_PUBLIC_STATUS_PAGE.md).

Bildirim / SMTP detay: `GET platform-admin/notifications/health`.

## Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `MAIL_MONITOR_POSTFIX_SHELL` | `false` | `true` → `mailq` çalıştır |
| `MAIL_MONITOR_QUEUE_WARN` | `50` | Outbox pending uyarı |
| `MAIL_MONITOR_QUEUE_CRIT` | `200` | Outbox kritik |
| `MAIL_MONITOR_POSTFIX_WARN` | `100` | Postfix kuyruk uyarı |
| `MAIL_MONITOR_POSTFIX_CRIT` | `500` | Postfix kritik |
| `MAIL_MONITOR_DISK_WARN_PERCENT` | `85` | Disk uyarı |
| `MAIL_MONITOR_DISK_CRIT_PERCENT` | `95` | Disk kritik |
| `MAIL_MONITOR_DISK_PATHS` | `/`, maildir, backup | Virgülle ayrılmış |
| `MAIL_MONITOR_CERT_WARN_DAYS` | `14` | TLS uyarı |
| `MAIL_MONITOR_CERT_CRIT_DAYS` | `3` | TLS kritik |
| `MAIL_TLS_CERT_PATHS` | — | Örn. `/etc/letsencrypt/live/mail.lerta.com.tr/fullchain.pem` |

## VPS cron (API dışı)

```bash
bash scripts/collect-mail-vps-monitoring.sh
```

JSON satırı stdout — log aggregator veya uyarı script’ine pipe edilebilir.

## Önerilen uyarılar

- `overallStatus=critical` → Slack/e-posta (operatör)
- Outbox `pending` 1 saat üst üste > eşik → drain / Postfix kontrol
- Disk > %90 → yedek retention / Maildir temizlik
- TLS < 14 gün → certbot renew

İlgili: [MAIL_BACKUP_DISASTER_RECOVERY.md](./MAIL_BACKUP_DISASTER_RECOVERY.md), [EMAIL_FAZ_A_PRODUCTION.md](./EMAIL_FAZ_A_PRODUCTION.md).
