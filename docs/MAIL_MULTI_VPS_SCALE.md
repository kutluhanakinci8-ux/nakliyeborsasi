# Lerta Mail — çok VPS / ayrı worker (F3)

Tek VPS’te `LERTA_MAIL_RUNTIME_ROLE` ayarlanmaz veya `all` kalır (mevcut pilot). Yük veya güvenlik ayrımı için:

| Rol | `LERTA_MAIL_RUNTIME_ROLE` | Ne çalışır |
|-----|---------------------------|------------|
| Tek düğüm (varsayılan) | `all` | API + tüm arka plan işleri |
| API / uygulama | `api` | HTTP, webmail, konsol; **arka plan kapalı** |
| Mail worker | `worker` | Outbox drain, DNS sync, billing grace, SMTP periyodik doğrulama, Postfix bootstrap |

## Arka planda yönetilen işler

Worker veya `all` düğümünde:

- `EmailOutboxProcessor` — outbox kuyruğu (~30s)
- `MailTenantDnsVerificationScheduler` — tenant domain DNS (~30 dk)
- `MailBillingGraceScheduler` — grace süresi (~15 dk)
- `EmailDeliveryHealthService` — SMTP verify (~6 saat)
- `MailInboundPostfixSyncBootstrap` — `MAIL_INBOUND_APPLY_POSTFIX=true` ise startup sync

`api` düğümünde bu zamanlayıcılar başlamaz; outbox kayıtları DB’de birikir ve **worker** drain eder.

## Örnek topoloji

```
[LB] → API VPS (role=api)     → PostgreSQL (ortak)
     → Mail VPS (role=worker) → Postfix/Dovecot/OpenDKIM, MAIL_MONITOR_POSTFIX_SHELL=true
```

- Her iki düğüm aynı `DATABASE_URL` ve mail ortam değişkenlerini kullanır.
- Postfix/Dovecot yalnızca mail VPS’te; API VPS’te `MAIL_INBOUND_APPLY_POSTFIX=false`.
- F1 izleme: `MAIL_MONITOR_POSTFIX_SHELL=true` ve disk/TLS yolları **mail worker** üzerinde anlamlıdır; API düğümünde F1 kartı `runtimeRole.role=api` gösterir.

## Ortam

```bash
# API düğümü
LERTA_MAIL_RUNTIME_ROLE=api
MAIL_INBOUND_APPLY_POSTFIX=false
MAIL_MONITOR_POSTFIX_SHELL=false

# Mail worker (168.231.109.27 benzeri)
LERTA_MAIL_RUNTIME_ROLE=worker
MAIL_INBOUND_APPLY_POSTFIX=true
MAIL_MONITOR_POSTFIX_SHELL=true
```

İkinci worker süreci: aynı `apps/api` build’i, farklı systemd unit veya `PORT` (worker’da HTTP dinleyici isteğe bağlı; health için `GET /health` kullanılabilir).

## Operatör kontrolü

- Konsol **Operatör → Ölçek (F3)** ve `GET platform-admin/mail/monitoring` → `runtimeRole`.
- Log: başlangıçta `outbox processor kapalı` / `worker` mesajları.

## Dağıtım notu

Yalnızca `api` çalıştırırsanız en az bir `worker` (veya `all`) düğümü zorunludur; aksi halde outbox ve grace işleri durur.

İlgili: [MAIL_PLATFORM_MONITORING.md](./MAIL_PLATFORM_MONITORING.md), [MAIL_BACKUP_DISASTER_RECOVERY.md](./MAIL_BACKUP_DISASTER_RECOVERY.md).
