# WinLRT W5 — Author v1 + vitrin sürümü

## Core

| Modül | Açıklama |
|--------|-----------|
| `ltrAuthorTemplates.ts` | Teklif, kapasite, rota şablonları |
| `ltrSealDocument.ts` | Mühürlü `.ltr` HTML (`ltr-content` script) |

## İstemciler

- **Desktop:** Author çubuğu + Kaydet (`write_text_file`)
- **Mobile:** Şablon → paylaş (`expo-sharing`)

## Vitrin (mail-marketing)

- `winlrtReleaseMeta.ts` — sürüm **0.1.0** ve MSI/DMG dosya adları
- `public/downloads/samples/sablon-*.ltr` — vitrin indirmesi
- `/destek/yazilim-indir` — sürüm satırı + şablon satırları

Yeni masaüstü sürümünde: CI artefakt → `public/downloads/winlrt/` + `WINLRT_RELEASE` güncelle.

## Test

```bash
npm run test -w @nakliyeborsasi/core
npm run validate -w @lerta/winlrt-mobile
npm run build -w @lerta/winlrt-desktop
```

Deploy: `scripts/agent-merge-deploy-winlrt-vitrin.sh` veya GitHub **Deploy WinLRT vitrin**.
