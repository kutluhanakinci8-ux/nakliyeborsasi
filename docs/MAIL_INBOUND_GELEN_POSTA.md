# Dışarıdan gelen posta (inbound) — kontrol listesi

## 1. DNS (isimtescil — zorunlu)

Dış gönderenler önce **MX** ile VPS’e yönlenir. Kayıt yoksa posta sunucuya hiç ulaşmaz.

```bash
bash scripts/print-instant-post-dns-isimtescil.sh   # kopyala-yapıştır tablo
bash scripts/verify-lerta-post-dns.sh               # Lerta Post zone
bash scripts/verify-mail-dns-lerta.sh               # lerta.com.tr tenant MX
```

| Ne | Kayıt |
|----|--------|
| Lerta Post (`info@firma.post`) | Wildcard **MX** `*.post.lerta.com.tr` → `10 mail.lerta.com.tr` + zone SPF/DMARC |
| `kullanici@lerta.com.tr` pilot | **MX** `lerta.com.tr` → `10 mail.lerta.com.tr` |
| MTA host | **A** `mail.lerta.com.tr` → VPS IP (`168.231.109.27`) |

`post.lerta.com.tr` **NXDOMAIN** ise Lerta Post adreslerine internetten posta **gelmez** — önce bölgeyi yayınlayın.

## 2. VPS Postfix (otomatik + onarım)

- `.env`: `MAIL_INBOUND_APPLY_POSTFIX=true`, `MAIL_INBOUND_VIRTUAL_DOMAINS=lerta.com.tr,post.lerta.com.tr`
- API açılışında `MailInboundPostfixSyncBootstrap` virtual haritayı yazır.
- IMAP kurulumu `virtual_transport=virtual` bırakmışsa inbound pipe kırılır:

```bash
bash scripts/fix-postfix-inbound-pipe-transport.sh
bash scripts/setup-postfix-inbound-c2.sh
cd /var/www/nakliyeborsasi && bash scripts/restart-api.sh
```

Platform admin: `POST /platform-admin/mail/inbound-routing/sync-postfix`

## 3. Doğrulama

```bash
# VPS
bash scripts/vps-diagnose-inbound-remote.sh
grep -E "virtual|pipe" /var/log/mail.log | tail -20
```

Gmail’den teknik adrese test: `info@<slug>.post.lerta.com.tr` (DNS yeşil olduktan sonra).
