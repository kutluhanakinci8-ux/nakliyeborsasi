#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
WEB_PORT="${2:-3011}"
API_PUBLIC_URL="${3:-http://127.0.0.1:3010/api/v1}"

cd "$INSTALL_DIR"

ENV_FILE="apps/web/.env.local"
echo "NEXT_PUBLIC_API_BASE_URL=${API_PUBLIC_URL}" > "$ENV_FILE"
echo "WEB_PORT=${WEB_PORT}" >> "$ENV_FILE"

npm run build -w @nakliyeborsasi/web

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete nakliyeborsasi-web 2>/dev/null || true
  WEB_PORT="$WEB_PORT" pm2 start npm --name nakliyeborsasi-web --cwd "$INSTALL_DIR" -- run start:web
  pm2 save
fi

sleep 2
curl -sS "http://127.0.0.1:${WEB_PORT}" | head -c 120 || true
echo ""
echo "Web panel: http://SUNUCU_IP:${WEB_PORT}"
