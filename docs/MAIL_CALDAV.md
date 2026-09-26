# CalDAV — org takvim hesabı (D6)

Webmail **Takvim** → **CalDAV hesabı**: HTTPS takvim koleksiyonuna Basic Auth ile bağlanır; etkinlikler org takvimine çekilir ve yerel etkinlikler sunucuya yazılabilir.

## Kullanım

1. Harici sunucudan takvim **koleksiyon URL**’si (ör. Nextcloud `…/remote.php/dav/calendars/kullanici/personal/`).
2. Kullanıcı adı + şifre → **Bağla** (PROPFIND doğrulaması).
3. **Çek** / **Tüm CalDAV hesaplarını çek** — `REPORT calendar-query` ile etkinlikler (`UID` upsert).
4. Liste satırında **CalDAV’a yaz** — yerel etkinlik `PUT` ile sunucuya gönderilir (yazma açık ilk hesap).

Harici **iCal URL** (şifresiz abonelik) için [MAIL_CALDAV_EXTERNAL.md](./MAIL_CALDAV_EXTERNAL.md). Kişiler: [MAIL_CARDDAV.md](./MAIL_CARDDAV.md).

## API

| Yöntem | Yol |
|--------|-----|
| GET | `calendar/caldav/accounts` |
| POST | `calendar/caldav/accounts` `{ label, calendarUrl, username, password, enabled?, writeEnabled? }` |
| PATCH | `calendar/caldav/accounts/:accountId` |
| DELETE | `calendar/caldav/accounts/:accountId` |
| POST | `calendar/caldav/accounts/:accountId/sync` |
| POST | `calendar/caldav/accounts/sync-all` |
| POST | `calendar/caldav/accounts/:accountId/push/:eventId` |

Şifre API yanıtlarında **asla** dönmüz; `mail_calendar_caldav_account.password_ciphertext` şifreli saklanır.

## Güvenlik

- Yalnızca **HTTPS**; özel/localhost IP engeli (SSRF).
- En fazla **3** hesap / org.
- Şifreleme: `MAIL_CALENDAR_CREDENTIAL_KEY` veya `AUTH_TOTP_ENCRYPTION_KEY` / `JWT_SECRET`.

## Ortam

| Değişken | Açıklama |
|----------|----------|
| `MAIL_CALENDAR_CALDAV_SYNC_INTERVAL_MS` | Otomatik çekme aralığı (ms). Varsayılan `3600000`. |
| `MAIL_CALENDAR_CREDENTIAL_KEY` | İsteğe bağlı 32+ bayt anahtar (yoksa TOTP/JWT anahtarı). |

## VPS şema

```bash
bash scripts/apply-mail-d6-caldav-schema.sh /var/www/nakliyeborsasi
```

## CalDAV silme ve ETag (uygulandı)

- Yerel etkinlik silinirken bağlı CalDAV kaynağına `DELETE` (yazma açık hesap).
- `PUT` sonrası `ETag` saklanır; güncellemede `If-Match` (412 → yeniden çekin).

## Sonraki

- Tekrarlayan etkinlikler
