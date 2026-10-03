#!/usr/bin/env bash
# VPS .env: SOCIAL_META_* + SOCIAL_OAUTH_ENCRYPTION_KEY (test/prod OAuth).
# Gizli değerler ortam değişkeninden gelir — repoya yazılmaz.
#
# Kullanım (VPS üzerinde veya SSH ile):
#   SOCIAL_META_APP_ID=... SOCIAL_META_APP_SECRET=... bash scripts/apply-social-meta-vps-env.sh
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "HATA: ${ENV_FILE} bulunamadı." >&2
  exit 1
fi

APP_ID="${SOCIAL_META_APP_ID:-}"
APP_SECRET="${SOCIAL_META_APP_SECRET:-}"
if [[ -z "${APP_ID}" || -z "${APP_SECRET}" ]]; then
  echo "HATA: SOCIAL_META_APP_ID ve SOCIAL_META_APP_SECRET gerekli." >&2
  exit 1
fi

REDIRECT_URI="${SOCIAL_META_OAUTH_REDIRECT_URI:-https://app.lerta.com.tr/api/v1/company/social-hub/oauth/callback}"
API_PUBLIC="${API_PUBLIC_BASE_URL:-https://app.lerta.com.tr/api/v1}"

set_kv() {
  local key="$1"
  local value="$2"
  python3 - "${ENV_FILE}" "${key}" "${value}" <<'PY'
import sys
path, key, value = sys.argv[1], sys.argv[2], sys.argv[3]
lines: list[str] = []
found = False
try:
    with open(path, encoding="utf-8") as f:
        lines = f.read().splitlines()
except FileNotFoundError:
    pass
out: list[str] = []
for line in lines:
    if line.startswith(key + "="):
        out.append(f"{key}={value}")
        found = True
    else:
        out.append(line)
if not found:
    out.append(f"{key}={value}")
with open(path, "w", encoding="utf-8") as f:
    f.write("\n".join(out) + "\n")
PY
}

if ! grep -q "^SOCIAL_META_WEBHOOK_VERIFY_TOKEN=.\+" "${ENV_FILE}" 2>/dev/null; then
  WEBHOOK_TOKEN="$(openssl rand -hex 24)"
else
  WEBHOOK_TOKEN="$(grep "^SOCIAL_META_WEBHOOK_VERIFY_TOKEN=" "${ENV_FILE}" | cut -d= -f2- | tr -d '\r')"
fi

if ! grep -q "^SOCIAL_OAUTH_ENCRYPTION_KEY=.\+" "${ENV_FILE}" 2>/dev/null; then
  OAUTH_ENC_KEY="$(openssl rand -hex 32)"
else
  OAUTH_ENC_KEY="$(grep "^SOCIAL_OAUTH_ENCRYPTION_KEY=" "${ENV_FILE}" | cut -d= -f2- | tr -d '\r')"
fi

set_kv "SOCIAL_META_APP_ID" "${APP_ID}"
set_kv "SOCIAL_META_APP_SECRET" "${APP_SECRET}"
set_kv "SOCIAL_META_OAUTH_REDIRECT_URI" "${REDIRECT_URI}"
set_kv "SOCIAL_META_WEBHOOK_VERIFY_TOKEN" "${WEBHOOK_TOKEN}"
set_kv "SOCIAL_OAUTH_ENCRYPTION_KEY" "${OAUTH_ENC_KEY}"
set_kv "API_PUBLIC_BASE_URL" "${API_PUBLIC}"
set_kv "SOCIAL_HUB_WEB_RETURN_URL" "${SOCIAL_HUB_WEB_RETURN_URL:-https://app.lerta.com.tr}"
if [[ -n "${SOCIAL_META_OAUTH_CONFIG_ID:-}" ]]; then
  set_kv "SOCIAL_META_OAUTH_CONFIG_ID" "${SOCIAL_META_OAUTH_CONFIG_ID}"
fi
if [[ -n "${SOCIAL_META_INSTAGRAM_BUSINESS_ACCOUNT_ID:-}" ]]; then
  set_kv "SOCIAL_META_INSTAGRAM_BUSINESS_ACCOUNT_ID" "${SOCIAL_META_INSTAGRAM_BUSINESS_ACCOUNT_ID}"
fi
if [[ -n "${SOCIAL_META_FACEBOOK_PAGE_ID:-}" ]]; then
  set_kv "SOCIAL_META_FACEBOOK_PAGE_ID" "${SOCIAL_META_FACEBOOK_PAGE_ID}"
fi
if [[ -n "${SOCIAL_META_INSTAGRAM_APP_ID:-}" ]]; then
  set_kv "SOCIAL_META_INSTAGRAM_APP_ID" "${SOCIAL_META_INSTAGRAM_APP_ID}"
fi
if [[ -n "${SOCIAL_META_INSTAGRAM_APP_SECRET:-}" ]]; then
  set_kv "SOCIAL_META_INSTAGRAM_APP_SECRET" "${SOCIAL_META_INSTAGRAM_APP_SECRET}"
fi
if [[ -n "${SOCIAL_META_INSTAGRAM_OAUTH_USE_LOGIN:-}" ]]; then
  set_kv "SOCIAL_META_INSTAGRAM_OAUTH_USE_LOGIN" "${SOCIAL_META_INSTAGRAM_OAUTH_USE_LOGIN}"
fi
if [[ -n "${SOCIAL_META_INSTAGRAM_SERVICE_ACCESS_TOKEN:-}" ]]; then
  set_kv "SOCIAL_META_INSTAGRAM_SERVICE_ACCESS_TOKEN" "${SOCIAL_META_INSTAGRAM_SERVICE_ACCESS_TOKEN}"
fi

if command -v pm2 >/dev/null 2>&1 && pm2 describe nakliyeborsasi-api >/dev/null 2>&1; then
  pm2 restart nakliyeborsasi-api --update-env
  echo "PM2: nakliyeborsasi-api --update-env"
elif [[ -x "${INSTALL_DIR}/scripts/restart-api.sh" ]]; then
  bash "${INSTALL_DIR}/scripts/restart-api.sh" "${INSTALL_DIR}"
else
  echo "UYARI: API yeniden başlatılamadı — elle restart gerekir."
fi

echo "OK: Social Meta env güncellendi (app id ${APP_ID})."
echo "META_WEBHOOK_VERIFY_TOKEN_FOR_CONSOLE=${WEBHOOK_TOKEN}"
