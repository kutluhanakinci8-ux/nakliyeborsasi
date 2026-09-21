#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
WEB_PORT="${2:-3011}"
API_PUBLIC_URL="${3:-}"

if [[ -z "${API_PUBLIC_URL}" ]]; then
  SERVER_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
  if [[ -n "${SERVER_IP}" ]]; then
    API_PUBLIC_URL="http://${SERVER_IP}:3010/api/v1"
  else
    API_PUBLIC_URL="http://127.0.0.1:3010/api/v1"
  fi
fi

if [[ "${INSTALL_DIR}" == http* ]]; then
  echo "Kullanım: bash scripts/restart-web.sh [kurulum_dizini] [web_portu] [api_url]" >&2
  echo "Örnek:    bash scripts/restart-web.sh /var/www/nakliyeborsasi 3011 http://168.231.109.27:3010/api/v1" >&2
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
  PORT="$WEB_PORT" HOSTNAME="0.0.0.0" pm2 start ./node_modules/next/dist/bin/next --name nakliyeborsasi-web --cwd "$INSTALL_DIR/apps/web" -- start -H 0.0.0.0 -p "$WEB_PORT"
  pm2 save
  echo "PM2: nakliyeborsasi-web başlatıldı (cwd=apps/web, PORT=${WEB_PORT})."
fi

sleep 3
HTTP_CODE="$(curl -sS -o /tmp/nakliyeborsasi-web-check.html -w "%{http_code}" "http://127.0.0.1:${WEB_PORT}/" || echo 000)"
if [[ "${HTTP_CODE}" == "200" ]]; then
  head -c 120 /tmp/nakliyeborsasi-web-check.html || true
  echo ""
  echo "Web OK (HTTP ${HTTP_CODE})"
else
  echo "UYARI: Web HTTP ${HTTP_CODE} — pm2 logs nakliyeborsasi-web --lines 30"
fi
echo "Web: http://SUNUCU_IP:${WEB_PORT}"
echo "API: ${API_PUBLIC_URL}"
