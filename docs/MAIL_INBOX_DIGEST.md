# Günlük gelen kutusu özet e-postası (G6)

Pilot: her organizasyon için **Europe/Istanbul saat 08:00** civarında (15 dk tarama penceresi) okunmamış gelen posta varsa bir özet e-postası gönderilir.

## Alıcı

Organizasyonun birincil posta adresi (`getSummary.primaryAddress`).

## Kapatma

Webmail → Ayarlar → **Bildirim** → “Günlük özet e-postası”.

## API

- `GET/PATCH company/mail-inbox/preferences` — `{ dailyDigestEnabled: boolean }`

## Teknik

- Tablo: `mail_inbox_preferences` (`lastDigestSentOn` ile günde bir kez)
- `MailInboxDigestScheduler` (15 dk aralık)
