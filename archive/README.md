# Kod arşivi (yedek)

Canlı uygulama **yalnızca `main` dalındaki** güncel kaynaklardan derlenir. Değiştirilen veya artık import edilmeyen dosyalar buraya taşınır; silinmez.

## Kurallar

1. **Yeni kod yazıp eskisini devre dışı bırakırken** dosyayı silmeyin — `scripts/archive-replaced-source.sh` ile bu dizine taşıyın.
2. Arşivdeki dosyalar **build / TypeScript / test** yollarına dahil edilmez (`tsconfig` / `exclude` ile).
3. Her taşıma `archive/code-replacements/manifest.jsonl` dosyasına bir satır ekler (tarih, neden, dosya listesi, git commit).
4. VPS ve GitHub’da tek kaynak: **`main`**. Feature işi `cursor/*-8521` ile açılır, merge sonrası dal silinir (`scripts/cleanup-merged-git-branches.sh`).

## Dizinler

| Yol | Açıklama |
|-----|----------|
| `archive/code-replacements/` | Eski kaynak dosyalar (tarih + kısa slug alt klasör) |
| `archive/code-replacements/manifest.jsonl` | Taşıma günlüğü (JSON Lines) |
| `archive/git/` | Dal temizliği raporları ve notlar |

## Örnek

```bash
# Eski bileşeni arşivle (git mv)
bash scripts/archive-replaced-source.sh "zengin metin toolbar eski" \
  apps/mail-web/src/app/mail/ComposeRichEditor.old.tsx
```

Detay: `docs/CODE_ARCHIVE_POLICY.md`
