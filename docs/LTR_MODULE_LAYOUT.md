# LTR modül yerleşimi (iskelet)

F0–F1: `core`, vitrin, web viewer. Posta/Mesaj API’leri F2+.

```text
core/src/ltr/                    ← validate, extract, renderBlocks
apps/web/public/ltr/             ← schema + örnek dosyalar
apps/web/src/app/indirmeler/
apps/web/src/app/ltr/viewer/     ← F1 web viewer (aktif)
apps/mobile/                     ← dosya tipleri + LTR panel iskeleti
docs/LTR_*.md

# Planlanan
apps/ltr-author-web/             ← F4
apps/api/src/modules/ltr/        ← F2 hosted, F4 linked
packages/ltr-sdk/                ← F2 Posta/Mesaj gömme (npm)
```

**Mağaza:** `com.lerta.ltr.viewer` (F5 ayrı APK/IPA) + `com.lerta.logistics` iç modül.

Bağımlılık: `apps/api` modülü F2’de `@nakliyeborsasi/core/ltr` import eder; mail/messaging servisleri yalnızca `LtrDocumentService` facadesine bağlanır.
