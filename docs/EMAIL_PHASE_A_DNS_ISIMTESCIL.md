# Faz A — DNS (isimtescil.net) + kendi MTA

Gönderim **yalnızca sizin VPS** (Postfix veya eşdeğer SMTP). Postmark, SES, SendGrid, Gmail relay kullanılmaz.

## 1. VPS — Postfix (özet)

1. VPS’te Postfix kurulumu; `myhostname` = `mail.lerta.tr` (veya seçtiğiniz gönderim host adı).
2. OpenDKIM (veya Rspamd) ile imza; public key’i DNS TXT olarak yayınlayın.
3. Uygulama `.env`: `SMTP_PROFILE=custom`, `SMTP_HOST=127.0.0.1`, `SMTP_PORT=25`, `SMTP_FROM=notifications@mail.lerta.tr`.
4. Admin → **Bildirimler → Platform gönderim** checklist + **Operasyon → SMTP doğrula**.

Detaylı kurulum adımları: [docs/EMAIL_PRODUCTION_SETUP.md](EMAIL_PRODUCTION_SETUP.md)

## 2. isimtescil — örnek kayıtlar (`lerta.tr`)

| Tür | Host | Örnek değer | Açıklama |
|-----|------|-------------|----------|
| TXT | `mail.lerta.tr` | `v=spf1 ip4:<VPS_IP> -all` | Gönderen IP sizin sunucu |
| TXT | `default._domainkey.mail.lerta.tr` | `v=DKIM1; k=rsa; p=…` | OpenDKIM public key |
| TXT | `_dmarc.lerta.tr` | `v=DMARC1; p=none; rua=mailto:dmarc@lerta.tr` | İlk haftalar `p=none` |

Env ile paneldeki tablo eşleşir:

- `MAIL_PLATFORM_SPF_IPV4` veya tam `MAIL_PLATFORM_SPF_TXT`
- `MAIL_PLATFORM_DKIM_TXT` (doğrulama için)
- `MAIL_PLATFORM_DKIM_SELECTOR` (varsayılan `default`)

## 3. Uygulama ortamı (üretim özet)

```env
MAIL_PLATFORM_DOMAIN=mail.lerta.tr
MAIL_PLATFORM_FROM_EMAIL=notifications@mail.lerta.tr
MAIL_PLATFORM_SPF_IPV4=<VPS genel IPv4>
MAIL_PLATFORM_DKIM_TXT=v=DKIM1; k=rsa; p=<...>
SMTP_PROFILE=custom
SMTP_HOST=127.0.0.1
SMTP_PORT=25
SMTP_FROM=Lerta Logistics <notifications@mail.lerta.tr>
PLATFORM_ADMIN_EMAILS=admin@lerta.tr
```

## 4. Operatör hesabı

Platform `/admin` girişi: **`admin@lerta.tr`** (seed). İlk şifre: `PLATFORM_OWNER_BOOTSTRAP_PASSWORD` / dokümantasyon.

## 5. Faz C (ileride)

Gelen posta için MX → aynı VPS veya ayrı mail hücresi; panel webmail bu repoda. Faz A yalnızca **giden bildirim** hattını tamamlar.
