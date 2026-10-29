# LTR modül yerleşimi (iskelet)

F0’da yalnızca `core` ve vitrin aktif. Posta/Mesaj API’leri F2+.

```text
core/src/ltr/           ← manifest sabitleri ve doğrulama
apps/web/public/ltr/    ← schema + örnek dosyalar
apps/web/src/app/indirmeler/
docs/LTR_*.md

# Planlanan (F1+)
apps/ltr-viewer-web/
apps/ltr-author-web/
apps/api/src/modules/ltr/
```

Bağımlılık: `apps/api` modülü F2’de `@nakliyeborsasi/core/ltr` import eder; mail/messaging servisleri yalnızca `LtrDocumentService` facadesine bağlanır.
