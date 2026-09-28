# Lerta Mail — JMAP köprüsü (HTTP bridge, v2)

## Karar (PM-10 / genişletme)

Tam bağımsız JMAP sunucusu (Cory / Fastmail uyumlu süreç) **kapsam dışı**. Üretimde **JWT korumalı HTTP köprü** kullanılır: webmail veri modeli + Dovecot maildir ile **okuma ve yazma** (`Email/set`, sanal `Mailbox/*`).

Thunderbird / Apple Mail için birincil yol hâlâ **IMAP** (`MAIL_PM5_IMAP_DOVECOT_RUNBOOK.md`). JMAP köprü; mobil prototipler, BI ve özel sync istemcileri için.

## Uç noktalar

| Metot | Yol | Açıklama |
|--------|-----|----------|
| GET | `/api/v1/company/mail-jmap/session` | JMAP Session (capabilities, `accountId` = `organizationId`) |
| POST | `/api/v1/company/mail-jmap` | `methodCalls` batch (RFC 8620 şekli) |

Kimlik: Bearer JWT (kurumsal mail rolü + TOTP politikası). `integration-status` → `jmap` alanı.

## Sanal klasörler (`Mailbox/*`)

| `id` | Rol | Liste (`Email/query` `filter.inMailbox`) |
|------|-----|------------------------------------------|
| `inbox` | inbox | `inbox` |
| `archive` | archive | `archive` |
| `trash` | trash | `trash` |
| `spam` | junk | `spam` |
| `starred` | — | `starred` |

`Mailbox/query` ve `Mailbox/get` özet sayıları `getSummary` ile senkron.

## Desteklenen methodlar

| Method | Davranış |
|--------|----------|
| `Mailbox/query` | Sanal klasör id listesi |
| `Mailbox/get` | Klasör meta + `totalEmails` / `unreadEmails` |
| `Email/query` | `filter.inMailbox`: `inbox` \| `archive` \| `trash` \| `spam` \| `starred`; `filter.text` → arama (≥2 karakter) |
| `Email/get` | `ids[]` → konu, gövde (`bodyValues` / text+html), ek meta, `keywords` (`$seen`, `$flagged`), `mailboxIds` (max 50 id) |
| `Email/set` | `update`: `keywords.$seen` / `$flagged`; `mailboxIds` ile taşıma (inbox, archive, trash, spam; `starred` → yıldız). `destroy`: yalnızca çöp kutusunda kalıcı silme |

## Henüz desteklenmeyen

| Method | Not |
|--------|-----|
| `Email/changes` | `canCalculateChanges: false` — tam delta sync yok |
| `Email/import` / gönderim | `POST company/mail-inbox/compose` |
| Özel kullanıcı klasörleri | Webmail REST / IMAP |
| Ek indirme (`blobId`) | REST `messages/:id/attachments/:index` |

## Örnek

```bash
# Oturum
curl -sS -H "Authorization: Bearer $TOKEN" \
  https://app.lerta.com.tr/api/v1/company/mail-jmap/session | jq .

# Klasörler
curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"using":["urn:ietf:params:jmap:core","urn:ietf:params:jmap:mail"],"methodCalls":[["Mailbox/query",{"accountId":"ORG_UUID"}, "m1"]]}' \
  https://app.lerta.com.tr/api/v1/company/mail-jmap

# Okundu işaretle
curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"using":["urn:ietf:params:jmap:core","urn:ietf:params:jmap:mail"],"methodCalls":[["Email/set",{"accountId":"ORG_UUID","update":{"MSG_UUID":{"keywords":{"$seen":true}}}}, "s1"]]}' \
  https://app.lerta.com.tr/api/v1/company/mail-jmap
```

Doğrulama: `bash scripts/verify-mail-jmap-bridge-prod.sh` · JWT ile `bash scripts/smoke-mail-jmap-bridge.sh`
