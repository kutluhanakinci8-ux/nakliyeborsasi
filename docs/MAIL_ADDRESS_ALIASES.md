# Lerta Mail — paylaşımlı alias (B4)

Kurumsal planda (`customDomainAllowed`) ek adresler, mevcut posta kutularına **kopya** inbound teslimatı yapar.

## Örnek

`destek@firma.com` → `ahmet@firma.com` + `ayse@firma.com` (en fazla 5 kutu / alias).

## API

| Metot | Yol |
|--------|-----|
| GET | `company/mail-identity/aliases` |
| POST | `company/mail-identity/aliases` — `{ mailDomainId, localPart, mailboxIds[], label? }` |
| DELETE | `company/mail-identity/aliases/:id` |

Konsol: **Posta kutuları** sayfası — «Paylaşımlı alias» bölümü (doğrulanmış özel domain gerekli).

## Inbound

1. Postfix `virtual_alias` haritasına alias adresi eklenir (`MailInboundRoutingService`).
2. Webhook ingest alias’ı çözümler; her hedef kutu için ayrı `mail_inbound_message` + Maildir teslimi.

Alias, mevcut gönderen kimliği veya posta kutusu adresi ile **çakışamaz**.

## Limitler

- Organizasyon: 25 alias
- Hedef: 5 kutu / alias

Denetim: `MAIL_ALIAS_CREATED`, `MAIL_ALIAS_REMOVED`.
