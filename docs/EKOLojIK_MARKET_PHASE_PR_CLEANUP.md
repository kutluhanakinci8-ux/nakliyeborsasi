# Ekolojik Market — faz PR temizliği (EK-CLEAN)

Canonical merge: **`main`** (PR **#341** merged). Eski dal PR’ları **#337–#340** kapatılabilir.

Rollup merge edildikten sonra aşağıdaki **draft/open faz PR’ları** kapatılabilir (içerik canonical dalda).

## Superseded branch kalıbı

`cursor/ekolojik-market-parity-ek-<faz>-5925` — **hariç:**

| Dal (EK-DEDUP) | PR |
|----------------|-----|
| `ek-roll-5925` | #337 |
| `ek-live-5925` | #338 |
| `ek-clean-5925` | #339 |
| `ek-close-5925` | #340 |

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

# EK-DEDUP — duplicate canonical PR (#337–#340) after #341 on main
bash scripts/run-ekolojik-market-close-duplicate-canonical-prs.sh
EK_DEDUP_CANONICAL_PRS=1 bash scripts/run-ekolojik-market-close-duplicate-canonical-prs.sh
```

`EK_CLOSE_REQUIRE_MAIN_ROLLED=0` yalnızca acil operatör senaryosu (önerilmez).

## Not

Bu belge yalnızca operatör rehberidir; GitHub PR’ları otomatik kapatılmaz.
