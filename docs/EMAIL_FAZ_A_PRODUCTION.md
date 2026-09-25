# Faz A — Üretim standardı (Aşama 1)

Platform bildirimleri: `notifications@mail.lerta.tr`, kuyruk, kendi Postfix/OpenDKIM.

## Admin checklist (A1–A7)

| ID | Konu |
|----|------|
| A1 | SPF, DKIM, DMARC (public DNS) |
| A2 | `SMTP_FROM` / `MAIL_PLATFORM_FROM_EMAIL` hizası |
| A3 | `SMTP_PROFILE=custom`, yerel veya VPS MTA |
| A4 | SMTP `verify` (başlangıç + ~6 saatte bir otomatik) |
| A5 | `mail.lerta.tr` **A** kaydı = `MAIL_PLATFORM_SPF_IPV4`; **PTR** hostname uyumu |
| A6 | Outbox: pending/failed eşikleri, 30 sn drain |
| A7 | Bounce **hard/spam** → otomatik suppression |

Panel: `/admin/bildirimler` → **Platform gönderim**.

## Ortam

```env
MAIL_PLATFORM_DOMAIN=mail.lerta.tr
MAIL_PLATFORM_FROM_EMAIL=notifications@mail.lerta.tr
MAIL_PLATFORM_SPF_IPV4=<VPS IPv4>
MAIL_PLATFORM_DKIM_TXT=v=DKIM1; ...
SMTP_PROFILE=custom
SMTP_HOST=127.0.0.1
SMTP_PORT=25
```

İsteğe bağlı: `PLATFORM_ADMIN_NOTIFY_USER_LOGIN=true` — admin’e her giriş maili (varsayılan **kapalı**).

## Operasyon runbook

Detaylı SPF/DKIM anahtar ve IP rotasyonu: [MAIL_SPF_DKIM_ROTATION_RUNBOOK.md](./MAIL_SPF_DKIM_ROTATION_RUNBOOK.md).

1. **Junk / düşük itibar:** PTR + A kaydı (A5). DMARC `rua` raporlarını izle.
2. **Kuyruk birikimi:** Admin → Operasyon → outbox drain; Postfix `mailq` VPS’te.
3. **Suppression:** Politika sekmesi veya otomatik (hard/spam). Manuel kaldırma: DELETE suppression API.
4. **Şikâyet / bounce:** Outbox detayında `bounceClass`; hard bounce adres tekrar kuyruğa alınmaz.

## Başarı kriteri (Faz A tamam)

- Checklist’te A1–A4 ve A6–A7 **ok**; A5 uyarıları bilinçli (PTR panel talebi).
- Kritik olaylar (kayıt, şifre, ihale) kullanıcıya gidiyor; `USER_LOGIN` admin gürültüsü kapalı.
- Son 24 saat gönderimler admin analitikte görünür.

Sonraki ürün fazı: [EMAIL_FAZ_B_KULLANICI_LERTA_TR.md](./EMAIL_FAZ_B_KULLANICI_LERTA_TR.md).
