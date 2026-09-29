# VPS operatör — sık komutlar (srv1828484)

**Proje kökü (deploy):** `/var/www/nakliyeborsasi`  
`npm` / `bash scripts/...` komutlarını **`/root` içinde çalıştırmayın** — `package.json` orada yok.

## SSH sonrası doğrulama (kopyala-yapıştır)

```bash
cd /var/www/nakliyeborsasi
git log -1 --oneline
bash scripts/vps-operator-verify.sh
```

Manuel adımlar:

```bash
cd /var/www/nakliyeborsasi

# Posta web build (deploy zaten yapar; el ile test için)
npm run build -w @lerta/mail-web

# Unit testler (core vitest — Node gerekir, repo kökünden)
npm run test:unit

# Prod smoke (Playwright **varsayılan kapalı** — sunucuda Chromium indirmek ağır)
SKIP_PLAYWRIGHT=1 bash scripts/run-messaging-maturity-mp-checklist.sh

# Canlı API FS-12 / messaging status
API_BASE=https://app.lerta.com.tr/api/v1 bash scripts/verify-messaging-wa-bridge-sandbox.sh

# MP-5: /health/live + (opsiyonel) operatör communications snapshot
API_BASE=https://app.lerta.com.tr/api/v1 bash scripts/verify-communications-ops-snapshot.sh
# Tam snapshot için platform operatör JWT:
# OPERATOR_JWT='<jwt>' API_BASE=https://app.lerta.com.tr/api/v1 bash scripts/verify-communications-ops-snapshot.sh
```

## Playwright E2E (genelde VPS’te değil)

Tam tarayıcı testi **geliştirme makinesi veya CI** için:

```bash
cd /path/to/nakliyeborsasi   # git clone, /root değil
npm install
npm run build -w @nakliyeborsasi/web
bash scripts/verify-messaging-playwright-e2e.sh
# Oturumlu hub testi:
E2E_ACCESS_TOKEN='<JWT>' npm run test:e2e -w @nakliyeborsasi/web
```

`E2E_ACCESS_TOKEN=...` içindeki `...` gerçek JWT değil — login sonrası token veya `MESSAGING_TEST_JWT` kullanın (`scripts/resolve-messaging-test-jwt.sh`).

## Sistem mesajları (Ubuntu)

| Mesaj | Öneri |
|--------|--------|
| `31 updates can be applied` | Bakım penceresinde: `apt update && apt upgrade` |
| `ESM Apps` | İsteğe bağlı Ubuntu Pro; zorunlu değil |
| `System restart required` | Kernel/libc güncellemesi sonrası planlı `reboot` (PM2/nginx kısa kesinti) |
| `client_loop: Broken pipe` | SSH zaman aşımı; yeniden `ssh root@168.231.109.27` |

## Deploy (lokal makineden)

```bash
bash scripts/deploy-vps-ssh.sh
```
