#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-/var/www/nakliyeborsasi/.env}"
REQUESTED_PORT="${2:-3010}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "HATA: $ENV_FILE bulunamadı"
  exit 1
fi

if grep -q '^PORT=' "$ENV_FILE"; then
  sed -i "s/^PORT=.*/PORT=${REQUESTED_PORT}/" "$ENV_FILE"
else
  echo "PORT=${REQUESTED_PORT}" >> "$ENV_FILE"
fi

echo "OK: PORT=${REQUESTED_PORT} ayarlandı ($ENV_FILE)"
echo "Diğer uygulamalara dokunulmadı. Başlat: bash scripts/restart-api.sh"
