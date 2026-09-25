#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
WEB_PORT="${2:-3014}"
CONSOLE_URL="${3:-https://yonetim.lerta.com.tr}"
MAIL_WEB_URL="${4:-https://posta.lerta.com.tr}"
API_PUBLIC_URL="${5:-https://yonetim.lerta.com.tr/api/v1}"

cd "$INSTALL_DIR"
bash scripts/install-deps.sh

ENV_FILE="apps/mail-marketing/.env.local"
BUILD_SHA="$(git -C "$INSTALL_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%MZ")"
{
  echo "NEXT_PUBLIC_CONSOLE_URL=${CONSOLE_URL}"
  echo "NEXT_PUBLIC_MAIL_WEB_URL=${MAIL_WEB_URL}"
  echo "NEXT_PUBLIC_API_BASE_URL=${API_PUBLIC_URL}"
  echo "NEXT_PUBLIC_DEPLOY_SHA=${BUILD_SHA}"
  echo "NEXT_PUBLIC_DEPLOY_TIME=${BUILD_TIME}"
} > "$ENV_FILE"

npm run build -w @lerta/mail-marketing

wait_http() {
  local url="$1"
  local label="$2"
  local attempt=0
  while [[ "$attempt" -lt 45 ]]; do
    if curl -sf -o /dev/null --connect-timeout 2 "$url"; then
      curl -sS -o /dev/null -w "${label} HTTP %{http_code}\n" "$url"
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done
  echo "UYARI: ${label} hazır değil (45s): ${url}" >&2
  return 1
}

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete lerta-mail-marketing 2>/dev/null || true
  NODE_ENV=production pm2 start npm \
    --name lerta-mail-marketing \
    --cwd "$INSTALL_DIR/apps/mail-marketing" \
    -- run start
  pm2 save
  echo "PM2: lerta-mail-marketing :${WEB_PORT}"
fi

wait_http "http://127.0.0.1:${WEB_PORT}/" "mail-marketing" || true
