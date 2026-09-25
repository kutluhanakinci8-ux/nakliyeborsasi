#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"

if [[ ! -f "$INSTALL_DIR/package.json" ]]; then
  echo "HATA: $INSTALL_DIR proje kökü değil."
  exit 1
fi

cd "$INSTALL_DIR"

bash "$INSTALL_DIR/scripts/install-deps.sh"

if [[ ! -f ".env" ]]; then
  cp .env.example .env
fi

if ! grep -q '^PORT=' .env; then
  echo "PORT=3010" >> .env
fi

API_PORT="$(grep '^PORT=' .env | cut -d= -f2- | tr -d '\r')"
if [[ "$API_PORT" == "3000" ]]; then
  echo "UYARI: PORT=3000 başka uygulamalarla çakışabilir."
  echo "Öneri: .env içinde PORT=3010 kullanın (diğer PM2 süreçlerine dokunulmaz)."
fi

npm run build

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete nakliyeborsasi-api 2>/dev/null || true
  pm2 start npm --name nakliyeborsasi-api --cwd "$INSTALL_DIR" -- run start
  pm2 save
  echo "PM2: yalnızca nakliyeborsasi-api yenilendi (diğer süreçlere dokunulmadı)."
  echo "Log: pm2 logs nakliyeborsasi-api --lines 50"
else
  nohup npm run start > /var/log/nakliyeborsasi-api.log 2>&1 &
  echo "Log: /var/log/nakliyeborsasi-api.log"
fi

echo "API başlatılıyor (port ${API_PORT})…"
attempt=0
while [[ "$attempt" -lt 60 ]]; do
  if curl -sf -o /dev/null --connect-timeout 2 "http://127.0.0.1:${API_PORT}/api/v1/health"; then
    break
  fi
  sleep 1
  attempt=$((attempt + 1))
done
bash "$INSTALL_DIR/scripts/diagnose-port.sh" "$API_PORT" || true
