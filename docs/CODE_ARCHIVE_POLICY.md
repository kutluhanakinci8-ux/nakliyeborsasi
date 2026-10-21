# Kod arşivi ve dal politikası

## Amaç

- Üretim kodunu **temiz** tutmak
- Eski sürümleri **geri dönülebilir** şekilde saklamak
- Tek doğru dal: **`main`** (VPS `DEPLOY_BRANCH=main`)

## Geliştirici akışı

1. `git checkout main && git pull origin main`
2. `git checkout -b cursor/<kisa-aciklama>-8521`
3. Değişiklik yapın; **eski dosyayı silmek yerine** arşivleyin:

   ```bash
   bash scripts/archive-replaced-source.sh "<neden>" path/to/OldFile.tsx
   ```

4. Commit, push, PR → **main**’e merge
5. Merge sonrası (yerel + uzak):

   ```bash
   DRY_RUN=0 APPLY=1 bash scripts/cleanup-merged-git-branches.sh
   ```

## Arşiv scripti

`scripts/archive-replaced-source.sh`:

- `git mv` ile `archive/code-replacements/<UTC-timestamp>-<slug>/` altına kopyalar
- `manifest.jsonl` günceller
- Dosya yoksa veya zaten arşivdeyse hata verir

## Dal temizliği

`scripts/cleanup-merged-git-branches.sh`:

- `origin/main`’e **tam merge edilmiş** `cursor/*` uzak dalları listeler
- Varsayılan: `DRY_RUN=1` (sadece rapor)
- `DRY_RUN=0 APPLY=1`: uzak dalı `git push origin --delete` ile kaldırır, yerel dalı siler
- **Merge edilmemiş** dallar silinmez; rapor `archive/git/unmerged-branches.txt`
- Çok geride kalan stale dallar: `scripts/archive-stale-branches-as-tags.sh` → `archive/cursor/*` git tag, sonra dal silinir

## TypeScript

`archive/**` kök `tsconfig` exclude listesinde; arşivlenen kod derlenmez.

## Veri yedekleri (sosyal link vb.)

Uygulama verisi için: `scripts/backup-mail-email-social-links.sh` (deploy öncesi otomatik).
