#!/usr/bin/env bash
# winlrt- GitHub reposunu monorepo'ya yönlendir (Cursor/GitHub karışıklığını önler).
# Gerekli: gh auth login (repo yazma yetkisi kutluhanakinci8-ux/winlrt-)
set -euo pipefail

TARGET_REPO="${WINLRT_POINTER_REPO:-kutluhanakinci8-ux/winlrt-}"
CANONICAL="https://github.com/kutluhanakinci8-ux/nakliyeborsasi"
VITRIN="https://www.lerta.com.tr/destek/yazilim-indir"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

gh repo clone "$TARGET_REPO" "$TMP/repo" -- --depth=1

cat > "$TMP/repo/README.md" <<EOF
# WinLRT

**LTR (.ltr) belge istemcisi** — sıkıştırma arşivi değil; Lerta Document formatı.

## ⚠️ Kaynak kod burada değil

Geliştirme, CI ve Cursor Cloud Agent **monorepo** üzerindedir:

- **Repo:** [$CANONICAL]($CANONICAL)
- **Kod:** \`apps/winlrt/\`, \`core/src/ltr/\`
- **İndirme vitrini:** [$VITRIN]($VITRIN)

Bu depo yalnızca GitHub/cursor listesinde kısa isim için tutulur. Issue ve PR’ları **nakliyeborsasi**’nde açın.

## Durum (özet)

| Faz | Platform |
|-----|----------|
| W1–W2 | Windows MSI, macOS DMG (vitrin) |
| W3–W4 | Android / iOS kod (Expo); mağaza yayını ayrı |
| W5 | Author v1 + şablonlar |
| W6+ | Posta/Mesaj entegrasyonu — **henüz yok** |

Detay: [WINLRT_PRODUCT_ROADMAP.md]($CANONICAL/blob/main/docs/WINLRT_PRODUCT_ROADMAP.md) · [Cursor bağlantısı]($CANONICAL/blob/main/docs/WINLRT_CURSOR_GITHUB.md)
EOF

cd "$TMP/repo"
git add README.md
if git diff --staged --quiet; then
  echo "winlrt- README zaten güncel."
  exit 0
fi
git commit -m "docs: canonical repo nakliyeborsasi + Cursor yönlendirmesi"
git push origin main
echo "=== winlrt- README güncellendi ==="
