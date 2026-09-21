#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
WEB_PORT="${2:-3011}"
API_PUBLIC_URL="${3:-http://127.0.0.1:3010/api/v1}"

if [[ "${INSTALL_DIR}" == http* ]]; then
  echo "Kullanım: bash scripts/restart-web.sh [kurulum_dizini] [web_portu] [api_url]" >&2
  echo "Örnek:    bash scripts/restart-web.sh /var/www/nakliyeborsasi 3011 http://127.0.0.1:3010/api/v1" >&2
  echo "Not: API URL birinci argüman değildir; üçüncü argümandır." >&2
  exit 1
fi

cd "$INSTALL_DIR"

bash scripts/install-deps.sh

ENV_FILE="apps/web/.env.local"
echo "NEXT_PUBLIC_API_BASE_URL=${API_PUBLIC_URL}" > "$ENV_FILE"

bash scripts/build-web.sh

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete nakliyeborsasi-web 2>/dev/null || true
  WEB_PORT="$WEB_PORT" pm2 start npm --name nakliyeborsasi-web --cwd "$INSTALL_DIR" -- run start:web
  pm2 save
  echo "PM2: nakliyeborsasi-web başlatıldı (diğer süreçlere dokunulmadı)."
fi

sleep 2
curl -sS "http://127.0.0.1:${WEB_PORT}" | head -c 120 || true
echo ""
echo "Web: http://SUNUCU_IP:${WEB_PORT}"
echo "API: ${API_PUBLIC_URL}"
