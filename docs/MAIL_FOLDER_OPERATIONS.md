# Posta klasör işlemleri (Gmail / Outlook uyumu)

## Rakip modeli

| İşlem | Gmail / Outlook | Lerta Post |
|--------|-----------------|------------|
| Gelen’de **Sil** | `mailboxFolder = trash` | ✅ `PATCH .../messages/:id/folder` → `trash` |
| Gelen’de **Arşivle** | `mailboxFolder = archive` | ✅ `folder` → `archive` |
| **Gönderilen**’de **Sil** | Çöp’e taşır (kayıt silinmez) | ✅ `PATCH .../sent/:id/trash` (`trashedAt`) |
| **Çöp** listesi | Gelen + gönderilen çöp | ✅ Gelen `trash` + gönderilen `trashedAt` |
| Çöp’te **Geri al** | Gelen kutusu / Gönderilen | ✅ Gelen → `inbox`; gönderilen → `trashedAt` null |
| Çöp’te **Sil** | Kalıcı sil | ✅ Gelen `DELETE`; gönderilen `DELETE` (önce çöpte olmalı) |

## API

- Gelen: `PATCH /company/mail-inbox/messages/:messageId/folder` — `{ "folder": "inbox" | "archive" | "trash" }`
- Gönderilen çöp: `PATCH /company/mail-inbox/sent/:sentId/trash` — `{ "trashed": true | false }`
- Gönderilen kalıcı sil: `DELETE /company/mail-inbox/sent/:sentId` (yalnızca çöpteyken)

## Veritabanı

- `mail_inbound_messages.mailboxFolder`
- `mail_mailbox_sent.trashedAt` (migration: `scripts/sql/mail-sent-trash.sql`)
