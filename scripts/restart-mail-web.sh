#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
WEB_PORT="${2:-3012}"
API_PUBLIC_URL="${3:-https://posta.lerta.com.tr/api/v1}"

cd "$INSTALL_DIR"
bash scripts/install-deps.sh

ENV_FILE="apps/mail-web/.env.local"
BUILD_SHA="$(git -C "$INSTALL_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%MZ")"
{
  echo "NEXT_PUBLIC_API_BASE_URL=${API_PUBLIC_URL}"
  echo "NEXT_PUBLIC_DEPLOY_SHA=${BUILD_SHA}"
  echo "NEXT_PUBLIC_DEPLOY_TIME=${BUILD_TIME}"
} > "$ENV_FILE"

npm run build -w @lerta/mail-web

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete lerta-mail-web 2>/dev/null || true
  PORT="$WEB_PORT" HOSTNAME="0.0.0.0" pm2 start ./node_modules/next/dist/bin/next \
    --name lerta-mail-web \
    --cwd "$INSTALL_DIR/apps/mail-web" \
    -- start -H 0.0.0.0 -p "$WEB_PORT"
  pm2 save
  echo "PM2: lerta-mail-web :${WEB_PORT}"
fi

curl -sS -o /dev/null -w "mail-web HTTP %{http_code}\n" "http://127.0.0.1:${WEB_PORT}/login"
