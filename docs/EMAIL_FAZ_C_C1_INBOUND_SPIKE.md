# Faz C1 — Inbound spike (MX + webhook)

Amaç: Gelen e-postayı **outbox’tan ayrı** `mail_inbound_message` tablosuna yazmak; admin’de listelemek.

## API

| Endpoint | Kimlik |
|----------|--------|
| `POST /api/v1/mail/inbound/webhook` | Header `X-Lerta-Inbound-Secret: <MAIL_INBOUND_WEBHOOK_SECRET>` |
| `GET /api/v1/platform-admin/mail/inbound-messages` | Platform admin JWT |
| `POST /api/v1/platform-admin/mail/inbound-messages/simulate` | Platform admin (test) |

JSON gövde (webhook veya simülasyon):

```json
{
  "recipient": "slug@kullanici.lerta.tr",
  "sender": "musteri@ornek.com",
  "subject": "Yanıt",
  "text": "Önizleme metni",
  "rawMime": "isteğe bağlı tam .eml"
}
```

**Kural (spike):** `recipient` için doğrulanmış domain + mevcut **sender identity** (Faz B provision) gerekir; ilk inbound’da `mail_mailbox` satırı oluşturulur.

## VPS `.env`

```bash
MAIL_INBOUND_WEBHOOK_SECRET=<uzun-rastgele>
# MAIL_INBOUND_STORAGE_DIR=/var/www/nakliyeborsasi/data/inbound
```

## Postfix pipe (pilot)

```bash
# scripts/postfix-pipe-inbound-to-api.sh
# virtual alias örnek:
# slug@kullanici.lerta.tr  "|/var/www/nakliyeborsasi/scripts/postfix-pipe-inbound-to-api.sh slug@kullanici.lerta.tr"
```

Script stdin’den MIME okur ve API’ye POST eder.

## MX (ileri adım)

Pilot için `kullanici.lerta.tr` veya müşteri domain’inde:

| Tür | Host | Değer |
|-----|------|--------|
| MX | `kullanici.lerta.tr` | `10 mail.lerta.tr` (veya doğrudan VPS hostname) |

Aynı VPS’te Postfix `virtual_alias_maps` + pipe transport. Tam IMAP/webmail **C2+**.

## Admin UI

**Bildirimler → Gelen (C1)** — liste + simülasyon.

## Kod

- `MailInboundIngestService`, `MailInboundWebhookController`
- Entity: `MailMailboxEntity`, `MailInboundMessageEntity`
