#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
PORT="${2:-3000}"

if [[ ! -f "$INSTALL_DIR/package.json" ]]; then
  echo "HATA: $INSTALL_DIR proje kökü değil."
  exit 1
fi

cd "$INSTALL_DIR"

if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
elif command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -ti ":${PORT}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$PIDS" ]]; then
    kill -9 $PIDS || true
  fi
fi

sleep 1

npm run build

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete nakliyeborsasi-api 2>/dev/null || true
  pm2 start npm --name nakliyeborsasi-api --cwd "$INSTALL_DIR" -- run start
  pm2 save
  echo "PM2 ile başlatıldı. Log: pm2 logs nakliyeborsasi-api"
else
  nohup npm run start > /var/log/nakliyeborsasi-api.log 2>&1 &
  echo "Arka planda başlatıldı. Log: /var/log/nakliyeborsasi-api.log"
fi

sleep 2
bash "$INSTALL_DIR/scripts/diagnose-port.sh" "$PORT"
