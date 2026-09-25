# Faz C2 — Webmail (liste/okuma) + Postfix MX yolu

## Organizasyon UI

**Hesap → Organizasyon → Gelen kutusu** (`#org-gelen-kutusu`)

- Varsayılan gönderen adresine gelen mesajlar (org mailbox)
- Liste, okuma, otomatik **okundu** işareti
- API: `GET /api/v1/company/mail-inbox`, `GET .../messages/:id`, `PATCH .../read`

## Admin

**Bildirimler → Gelen (C1)** — tüm inbound + **Postfix virtual senkron**

- `GET /api/v1/platform-admin/mail/inbound-routing` — alias önizleme
- `POST .../inbound-routing/sync-postfix` — `MAIL_INBOUND_APPLY_POSTFIX=true` ise dosya yaz + `postmap`

## VPS kurulum

```bash
bash scripts/setup-postfix-inbound-c2.sh
```

`.env` örneği:

```bash
MAIL_INBOUND_VIRTUAL_DOMAINS=kullanici.lerta.tr
MAIL_INBOUND_POSTFIX_VIRTUAL_PATH=/etc/postfix/lerta-inbound-virtual
MAIL_INBOUND_PIPE_SCRIPT=/var/www/nakliyeborsasi/scripts/postfix-pipe-inbound-to-api.sh
MAIL_INBOUND_APPLY_POSTFIX=true
MAIL_INBOUND_WEBHOOK_SECRET=...
```

DNS: **MX** `kullanici.lerta.tr` → `mail.lerta.tr` (priority 10).

## Veri

- `mail_inbound_message.bodyText` — düz metin (C2)
- Outbox ile **karışmaz** — ayrı tablo ve UI

## Sonraki (C3+)

Yanıt yazma (compose), ekler, IMAP, Rspamd.
