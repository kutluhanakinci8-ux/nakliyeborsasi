# WinLRT ↔ Cursor ↔ GitHub bağlantısı

## Hangi repo?

| GitHub | Rol |
|--------|-----|
| **[nakliyeborsasi](https://github.com/kutluhanakinci8-ux/nakliyeborsasi)** | **Asıl WinLRT kodu** (`apps/winlrt/`, `core/src/ltr/`, vitrin, CI) |
| **[winlrt-](https://github.com/kutluhanakinci8-ux/winlrt-)** | Boş/iskelet repo; **Cursor’da tek başına açmayın**. README’yi monorepo’ya yönlendirmek için `scripts/publish-winlrt-github-pointer.sh` |

## Cursor Cloud Agent (otomatik ortam)

1. [Cursor Dashboard](https://cursor.com/dashboard) → **Cloud Agents** → **Environments**
2. **Add repository** → `kutluhanakinci8-ux/nakliyeborsasi`
3. Ortam ayarı repodaki **`.cursor/environment.json`** dosyasını okur (`install`: `npm ci` + core + mobile validate).
4. **Build** tetikleyin (Environment → Verify / Build); yeşil build sonrası WinLRT agent’ları hızlı açılır.
5. Yeni agent: repo `nakliyeborsasi`, dal `cursor/...-81ce`, görev metninde `docs/WINLRT_PRODUCT_ROADMAP.md` veya faz (W1–W5) belirtin.

Proje kuralları: `.cursor/rules/winlrt-cloud-agent.mdc` (WinLRT dosyalarında otomatik).

## GitHub Secrets (vitrin deploy)

Repo **Settings → Secrets and variables → Actions**:

| Secret | Amaç |
|--------|------|
| `VPS_HOST` | `168.231.109.27` (veya güncel IP) |
| `VPS_SSH_KEY` | root SSH private key |
| `VPS_USER` | `root` (isteğe bağlı) |

Bunlar tanımlıysa **`Deploy WinLRT vitrin`** workflow’u main push’ta yalnızca mail-marketing vitrinini günceller.

Yerel agent / VM:

```bash
VPS_SSH_PRIVATE_KEY='…' bash scripts/deploy-winlrt-vitrin-only.sh
```

## `winlrt-` reposunu hizalama (tek sefer)

Kendi makinenizde (GitHub CLI girişli):

```bash
bash scripts/publish-winlrt-github-pointer.sh
```

Bu, `winlrt-` README’sini monorepo linki + WinLRT durum özeti ile günceller.

## CI (GitHub ↔ WinLRT)

| Workflow | Ne |
|----------|-----|
| `winlrt-windows.yml` | MSI/NSIS |
| `winlrt-macos.yml` | DMG |
| `winlrt-mobile.yml` | Android + iOS typecheck |
| `deploy-winlrt-vitrin.yml` | www vitrin (:3014) |

Entegrasyon workflow’ları (Deploy VPS tam stack) WinLRT-only commit’lerde **paths-ignore** ile atlanır.
