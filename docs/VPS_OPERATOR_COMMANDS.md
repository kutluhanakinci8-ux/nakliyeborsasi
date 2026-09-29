# VPS operatör — sık komutlar (srv1828484)

**Proje kökü (deploy):** `/var/www/nakliyeborsasi`  
`npm` / `bash scripts/...` komutlarını **`/root` içinde çalıştırmayın** — `package.json` orada yok.

## SSH sonrası doğrulama (kopyala-yapıştır)

```bash
cd /var/www/nakliyeborsasi
git log -1 --oneline
# .env içinde OPERATOR_TEST_EMAIL + OPERATOR_TEST_PASSWORD → MP-5/6 JWT otomatik
bash scripts/vps-operator-verify.sh
```

`vps-operator-verify` sırası: env ipuçları · PM2 API tekillik uyarısı · `/health/live` · unit test · MP checklist.

Prod ortam kontrolleri (uyarı, FAIL değil):

```bash
bash scripts/verify-vps-prod-env-hints.sh   # WA webhook, operatör .env
bash scripts/verify-pm2-api-singleton.sh    # çift API süreci uyarısı
```

Manuel adımlar:

```bash
cd /var/www/nakliyeborsasi

# API build — core önce (MP-6+ @nakliyeborsasi/core export); veya tek komut:
npm run build -w @nakliyeborsasi/core && npm run build -w @nakliyeborsasi/api
# (api `prebuild` artık core'u otomatik derler)

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
# Tam snapshot — gerçek JWT (placeholder `<platform-admin-jwt>` 401 verir):
# OPERATOR_JWT='eyJhbG…' bash scripts/verify-communications-ops-snapshot.sh
# veya .env: OPERATOR_TEST_EMAIL + OPERATOR_TEST_PASSWORD (platform admin, TEST_USERS.md)

# MP-6 engagement export (aynı OPERATOR_JWT)
bash scripts/verify-mail-deliverability-mp6.sh

# MP-7 axe (VPS'te varsayılan kapalı — Chromium)
SKIP_AXE=0 bash scripts/verify-messaging-a11y-mp7.sh

# MP-8 PWA (posta shell + hub manifest; Lighthouse varsayılan kapalı)
bash scripts/verify-messaging-hub-pwa-mp8.sh
# SKIP_LIGHTHOUSE=0 LIGHTHOUSE_PWA_MIN=85 bash scripts/verify-messaging-hub-pwa-mp8.sh

# MP-9 güvenlik dok + due diligence ZIP
bash scripts/verify-security-compliance-mp9.sh
bash scripts/pack-customer-due-diligence-mp9.sh   # zip CLI gerekmez (python3 yedek)
# Çeyreklik: SKIP_NPM_AUDIT=0 bash scripts/verify-security-compliance-mp9.sh

# MP-10 parite kapanış (tam: maturity + wave-2 — birkaç dakika)
MP10_FULL=1 bash scripts/verify-messaging-parity-close-mp10.sh
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
