# Gelen kutusu kuralları (G5 MVP)

Kurallar **organizasyon** bazında; yeni inbound mesaj ingest edildiğinde (spam engelli değil, gelen klasöründe) sırayla değerlendirilir — **ilk eşleşen** kural uygulanır.

## Koşullar (AND)

- `fromContains` — gönderen adresinde (büyük/küçük harf duyarsız alt string)
- `subjectContains` — konuda (aynı şekilde)

En az biri dolu olmalı; ikisi doluysa **her ikisi** sağlanmalı.

## İşlemler

- `actionStar` — yıldızla
- `actionCustomFolderId` — özel klasöre taşı

En az biri seçilmeli.

## API

- `GET/POST/PATCH/DELETE company/mail-inbox/rules`

## UI

`posta.lerta.com.tr/mail` → Ayarlar → **Kurallar**
