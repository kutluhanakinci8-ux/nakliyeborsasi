# Faz C3 — Yanıt / compose, ekler, spam

## Gönderim (outbox’tan ayrı)

Firma sahibi:

- `POST /api/v1/company/mail-inbox/compose` — yeni mail (SMTP, kurumsal From)
- `POST /api/v1/company/mail-inbox/messages/:id/reply` — `In-Reply-To` / `References`

Kayıt: `mail_mailbox_sent`. Saatlik limit: `MAIL_ORG_MAX_SENDS_PER_HOUR` (Faz B3 ile paylaşımlı).

Ekler: JSON `attachments[]` — base64, max 3 × 2MB.

## Gelen — spam

`MailInboundSpamService`:

| Durum | Anlam |
|--------|--------|
| `clean` | Normal gelen |
| `suspected` | Anahtar kelime / boyut uyarısı (gelen kutusunda ⚠) |
| `blocked` | Suppression veya `MAIL_INBOUND_SPAM_BLOCK_FROM` |

`.env`:

```bash
# MAIL_INBOUND_SPAM_KEYWORDS=viagra,crypto,click here
# MAIL_INBOUND_SPAM_BLOCK_FROM=spamdomain.com
# MAIL_INBOUND_SPAM_MAX_BODY_CHARS=120000
```

UI: **Gelen / Spam / Tümü** sekmeleri.

## Ekler (inbound)

MIME `attachment` parçaları → `data/inbound/attachments/<messageId>/`

İndirme: `GET .../messages/:id/attachments/:index` (JWT).

## UI

**Hesap → Organizasyon → Gelen kutusu** — liste, okuma, yanıt, yeni mail, giden listesi.
