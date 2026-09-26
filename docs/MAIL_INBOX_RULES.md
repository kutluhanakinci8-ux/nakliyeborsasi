# Gelen kutusu kuralları (G5 / G5+)

Kurallar **organizasyon** bazında; yeni inbound mesaj ingest edildiğinde (spam engelli değil, gelen klasöründe) sırayla değerlendirilir — **ilk eşleşen** kural uygulanır.

## Koşullar (AND)

- `fromContains` — gönderen adresinde (büyük/küçük harf duyarsız alt string)
- `subjectContains` — konuda (aynı şekilde)
- `toContains` — **To** alıcı listesinde (G5+)
- `requireAttachment` — yalnızca ekli postalar (G5+)

En az biri dolu olmalı; birden fazla koşul **hepsi** sağlanmalı.

## İşlemler

- `actionStar` — yıldızla
- `actionCustomFolderId` — özel klasöre taşı
- `actionArchive` — arşive taşı (maildir + `mailboxFolder`)
- `actionMarkRead` — okundu işaretle (`readAt`)
- `actionTrash` — çöpe taşı (maildir + `mailboxFolder`)

En az biri seçilmeli. Birden fazla işlem aynı kuralda birlikte uygulanabilir.

## API

- `GET/POST/PATCH/DELETE company/mail-inbox/rules`
- `POST company/mail-inbox/rules/reorder` — `{ "ruleIds": ["uuid", ...] }` tam liste sırası
- `GET company/mail-inbox/rules/:ruleId/preview` — gelen kutusunda eşleşme sayısı (ilk 500 mesaj)
- `POST company/mail-inbox/rules/:ruleId/apply-inbox` — mevcut gelen kutusuna uygula (en fazla 100 mesaj, yönetici)

## UI

`posta.lerta.com.tr/mail` → Ayarlar → **Kurallar** — **Önizle**, **Gelen kutusuna uygula**
