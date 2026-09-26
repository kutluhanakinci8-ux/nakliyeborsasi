# CardDAV — org kişi adres defteri (D6)

Webmail **Kişiler** → **CardDAV adres defteri**: HTTPS adres defteri koleksiyonuna Basic Auth; kişiler org listesine çekilir, yerel kişiler sunucuya yazılabilir.

## Kullanım

1. Sunucudan adres defteri URL’si (ör. Nextcloud `…/remote.php/dav/addressbooks/user/contacts/`).
2. **Bağla** — PROPFIND doğrulaması.
3. **Çek** / toplu senkron — `addressbook-query` + vCard parse (`UID` veya sentetik anahtar).
4. **CardDAV’a yaz** — ilk yazma açık hesaba `PUT` vCard.

Takvim CalDAV: [MAIL_CALDAV.md](./MAIL_CALDAV.md).

## API

| Yöntem | Yol |
|--------|-----|
| GET | `contacts/carddav/accounts` |
| POST | `contacts/carddav/accounts` |
| PATCH | `contacts/carddav/accounts/:accountId` |
| DELETE | `contacts/carddav/accounts/:accountId` |
| POST | `contacts/carddav/accounts/:accountId/sync` |
| POST | `contacts/carddav/accounts/sync-all` |
| POST | `contacts/carddav/accounts/:accountId/push/:contactId` |

Kimlik bilgisi şifreleme CalDAV ile aynı (`MAIL_CALENDAR_CREDENTIAL_KEY` vb.).

## Ortam

| Değişken | Açıklama |
|----------|----------|
| `MAIL_CONTACT_CARDDAV_SYNC_INTERVAL_MS` | Otomatik çekme (varsayılan 1 saat). |

## VPS şema

```bash
bash scripts/apply-mail-d6-carddav-schema.sh /var/www/nakliyeborsasi
```
