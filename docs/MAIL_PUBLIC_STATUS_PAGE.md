# Lerta Mail — halka açık durum sayfası (F2)

## URL

| Ortam | Adres |
|-------|--------|
| Vitrin | `https://www.lerta.com.tr/durum` (mail-marketing) |
| Önerilen alias | `https://status.lerta.com.tr` → `/durum` (nginx CNAME) |

## API (kimlik doğrulama yok)

`GET /api/v1/public/lerta-mail/status`

Yanıt: `statusPage` — `overall`, `overallLabelTr`, `components[]` (api, webmail, console, outbound, inbound).  
Kaynak: F1 `MailPlatformMonitoringService` (hassas yol/IP sızdırmaz).

## Operatör mesajları

| Env | Açıklama |
|-----|----------|
| `MAIL_PUBLIC_STATUS_MESSAGE` | Banner altında kullanıcıya metin |
| `MAIL_PUBLIC_STATUS_MAINTENANCE=true` | Tüm bileşenler «bakım» |

## Nginx örneği (`status.lerta.com.tr`)

```nginx
server {
    listen 443 ssl http2;
    server_name status.lerta.com.tr;
    return 302 https://www.lerta.com.tr/durum;
}
```

Veya aynı marketing upstream ile `location = / { proxy_pass .../durum; }`.

## İlgili

- [MAIL_PLATFORM_MONITORING.md](./MAIL_PLATFORM_MONITORING.md) (operatör detay)
- [sla sayfası](../apps/mail-marketing/src/app/sla/page.tsx)
