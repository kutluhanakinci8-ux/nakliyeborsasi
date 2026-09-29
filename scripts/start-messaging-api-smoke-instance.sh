#!/usr/bin/env bash
# FS-8.3: İkinci nakliyeborsasi-api instance (Redis SSE fan-out testi).
# NOT: 3012 = lerta-mail-web — varsayılan smoke portu 3015.
set -euo pipefail
INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
PORT="${SMOKE_SECOND_API_PORT:-3015}"
INSTANCE_ID="${MESSAGING_SSE_INSTANCE_ID_B:-messaging-smoke-b}"
NAME="${PM2_SMOKE_API_NAME:-nakliyeborsasi-api-smoke}"

cd "${INSTALL_DIR}"
# shellcheck disable=SC1090
set -a
[[ -f "${INSTALL_DIR}/.env" ]] && source "${INSTALL_DIR}/.env"
set +a

export PORT
export MESSAGING_SSE_INSTANCE_ID="${INSTANCE_ID}"

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete "${NAME}" 2>/dev/null || true
  PORT="${PORT}" MESSAGING_SSE_INSTANCE_ID="${INSTANCE_ID}" pm2 start npm --name "${NAME}" \
    --cwd "${INSTALL_DIR}" -- run start --update-env
  pm2 save
  echo "PM2: ${NAME} PORT=${PORT} MESSAGING_SSE_INSTANCE_ID=${INSTANCE_ID}"
else
  echo "HATA: pm2 gerekli" >&2
  exit 1
fi

sleep 4
curl -fsS "http://127.0.0.1:${PORT}/api/v1/health" | head -c 80
echo ""
echo "Smoke: SMOKE_SECOND_API_PORT=${PORT} SMOKE_SECOND_API_BASE=http://127.0.0.1:${PORT}/api/v1 bash scripts/smoke-messaging-sse-two-instance.sh"
