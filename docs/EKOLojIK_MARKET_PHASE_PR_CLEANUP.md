# Ekolojik Market — faz PR temizliği (EK-CLEAN)

Canonical merge: **`cursor/ekolojik-market-parity-ek-roll-5925`** veya **`cursor/ekolojik-market-parity-ek-live-5925`** (aynı ağaç; PR **#337** / **#338**).

Rollup merge edildikten sonra aşağıdaki **draft/open faz PR’ları** kapatılabilir (içerik canonical dalda).

## Superseded branch kalıbı

`cursor/ekolojik-market-parity-ek-<faz>-5925` — **hariç:**

| Tutulacak | Açıklama |
|-----------|----------|
| `ek-roll-5925` | Canonical rollup |
| `ek-live-5925` | Roll + EK-LIVE (deploy kapı) |
| `ek-clean-5925` | Temizlik doğrulama |
| `ek-close-5925` | STALE PR kapatma (EK-CLOSE) |

## Faz dalları (kapatılabilir)

- `ek-0`, `ek-p4`, `ek-p6` … `ek-p11`
- `ek-m2` … `ek-m11`, `ek-s2` … `ek-s10`
- `ek-u4`, `ek-u4-p-close`, `ek-ci`, `ek-vps`, `ek-full`

## Komutlar

```bash
# Repo doğrulama (CI / VPS, secret gerekmez)
bash scripts/verify-ekolojik-market-phase-pr-cleanup.sh

# Opsiyonel: açık PR listesi (gh CLI + repo erişimi)
EK_CLEAN_LIST_OPEN=1 bash scripts/verify-ekolojik-market-phase-pr-cleanup.sh

# EK-CLOSE — rollup main'e merge edildikten sonra (varsayılan dry-run)
bash scripts/run-ekolojik-market-close-stale-phase-prs.sh
EK_CLOSE_STALE_PRS=1 bash scripts/run-ekolojik-market-close-stale-phase-prs.sh
```

`EK_CLOSE_REQUIRE_MAIN_ROLLED=0` yalnızca acil operatör senaryosu (önerilmez).

## Not

Bu belge yalnızca operatör rehberidir; GitHub PR’ları otomatik kapatılmaz.
