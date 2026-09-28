# Lerta Mail — JMAP köprüsü (read-only bridge)

## Karar (PM-10)

Tam JMAP sunucusu (Cory / Fastmail uyumlu) **kapsam dışı**. Üretimde **JWT korumalı HTTP köprü** kullanılır: mevcut webmail veri modeli üzerinden salt okunur `Email/query` ve `Email/get`.

Gelişmiş istemciler (mobil sync prototipi, BI) için yeterli; Thunderbird / Apple Mail için **IMAP** (`MAIL_PM5_IMAP_DOVECOT_RUNBOOK.md`) birincil yol.

## Uç noktalar

| Metot | Yol | Açıklama |
|--------|-----|----------|
| GET | `/api/v1/company/mail-jmap/session` | JMAP Session (capabilities, accountId = `organizationId`) |
| POST | `/api/v1/company/mail-jmap` | `methodCalls` batch (RFC 8620 şekli) |

Kimlik: Bearer JWT (kurumsal mail rolü + TOTP politikası). `integration-status` → `jmap` alanı.

## Desteklenen methodlar

| Method | Davranış |
|--------|----------|
| `Email/query` | `filter.inMailbox`: `inbox` \| `archive` \| `trash` \| `spam`; `filter.text` → arama (≥2 karakter) |
| `Email/get` | `ids[]` → konu, gönderen, önizleme, ek bayrağı (max 50 id) |

## Henüz desteklenmeyen (plan)

| Method | Not |
|--------|-----|
| `Email/set` | Okundu/yıldız/klasör — webmail REST kullanın |
| `Mailbox/*` | Sanal klasörler; `inMailbox` filtresi yeterli |
| `Email/import` | Gönderim `POST company/mail-inbox/compose` |

## Örnek

```bash
# Oturum
curl -sS -H "Authorization: Bearer $TOKEN" \
  https://app.lerta.com.tr/api/v1/company/mail-jmap/session | jq .

# Sorgu
curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"using":["urn:ietf:params:jmap:core","urn:ietf:params:jmap:mail"],"methodCalls":[["Email/query",{"accountId":"ORG_UUID","filter":{"inMailbox":"inbox"},"limit":10},"c1"]]}' \
  https://app.lerta.com.tr/api/v1/company/mail-jmap
```

Doğrulama: `bash scripts/verify-mail-jmap-bridge-prod.sh` · JWT ile `bash scripts/smoke-mail-jmap-bridge.sh`
