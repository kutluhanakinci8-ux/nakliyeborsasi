# Git dal raporları

`scripts/cleanup-merged-git-branches.sh` çalıştırıldığında:

- `merged-branches-cleanup-*.txt` — silinen / silinecek merge edilmiş `cursor/*` listesi
- `unmerged-branches.txt` — hâlâ `main`’de olmayan commit içeren dallar (manuel inceleme)

Merge edilmemiş dallar **otomatik silinmez**. İçerik `main`’e alındıysa merge edin; gereksizse dalı kapatın.
