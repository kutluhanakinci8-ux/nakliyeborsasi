# Gelen kutusu kuralları (G5 / G5+)

Kurallar **organizasyon** bazında; yeni inbound mesaj ingest edildiğinde (spam engelli değil, gelen klasöründe) sırayla değerlendirilir — **ilk eşleşen** kural uygulanır.

## Koşullar

- `fromContains` — gönderen adresinde (büyük/küçük harf duyarsız alt string)
- `subjectContains` — konuda (aynı şekilde)
- `toContains` — **To** alıcı listesinde (G5+)
- `requireAttachment` — ek koşulu (G5+)

En az biri dolu olmalı — veya geçerli **`conditionGroups`** JSON (G6+ gruplar).

### Koşul grupları (`conditionGroups`)

En fazla **3** grup. Her grupta `fromContains`, `subjectContains`, `toContains`, `requireAttachment` (düz metin alanlarında `|` alternatifleri geçerli).

| Alan | Davranış |
|------|----------|
| `groups[].matchAny` | Grup içi VEYA / VE |
| `matchAnyBetweenGroups` | Gruplar arası VEYA / VE |

Örnek: `(gönderen destek VE konu fatura) VEYA (alıcı muhasebe)` — iki grup, aralarında VEYA.

**Alternatif (OR alt string):** `fromContains`, `subjectContains`, `toContains` alanlarında `|` ile ayrılmış değerlerden **biri** eşleşirse o koşul sağlanır (ör. `destek|support`).

| `matchAnyCondition` | Davranış |
|-------------------|----------|
| `false` (varsayılan) | Dolu koşulların **hepsi** sağlanmalı (VE). `requireAttachment` true ise ek zorunlu. |
| `true` | Dolu koşullardan **herhangi biri** yeterli (VEYA). `requireAttachment` ayrı bir OR dalıdır. |

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
- `GET company/mail-inbox/rules/:ruleId/preview` — gelen kutusunda eşleşme sayısı (ilk 500 mesaj); `matchLogicDescription`; `samples[].matchedBecause`; `nonMatchingSamples[].failedBecause` (en fazla 3 karşı örnek)
- `POST company/mail-inbox/rules/:ruleId/apply-inbox` — mevcut gelen kutusuna uygula (en fazla 100 mesaj, yönetici)

## UI

`posta.lerta.com.tr/mail` → Ayarlar → **Kurallar** — **Düzenle** (düz koşul veya gruplar), **Önizle**, **Gelen kutusuna uygula**
