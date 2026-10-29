# WinLRT vitrin deploy (bağımsız)

Posta, mesaj, API ve u88 **bu script ile yeniden başlatılmaz**.

## Her faz sonrası

```bash
export VPS_SSH_PASSWORD='…'   # tercihen VPS_SSH_PRIVATE_KEY
bash scripts/agent-merge-deploy-winlrt-vitrin.sh cursor/<dal>-81ce
```

Veya main zaten güncelse:

```bash
VPS_SSH_PASSWORD='…' bash scripts/deploy-winlrt-vitrin-only.sh
```

## Sunucuda ne olur?

1. `git reset --hard origin/main` (`.env` dosyaları korunur)
2. `scripts/restart-mail-marketing.sh` → `:3014`, PM2 `lerta-mail-marketing`
3. Smoke: `/destek/yazilim-indir`

## Canlı URL

- https://www.lerta.com.tr/destek/yazilim-indir
- Footer: Destek → Yazılım indir

Tam stack deploy için (WinLRT dışı): `bash scripts/agent-merge-deploy-main.sh`

Cursor + GitHub: [WINLRT_CURSOR_GITHUB.md](./WINLRT_CURSOR_GITHUB.md)
