#!/usr/bin/env bash
# FS-8.3: Ikinci nakliyeborsasi-api instance (Redis SSE fan-out testi).
# NOT: 3012 = lerta-mail-web -- varsayilan smoke portu 3015.
set -euo pipefail
INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
SMOKE_PORT="${SMOKE_SECOND_API_PORT:-3015}"
INSTANCE_ID="${MESSAGING_SSE_INSTANCE_ID_B:-messaging-smoke-b}"
NAME="${PM2_SMOKE_API_NAME:-nakliyeborsasi-api-smoke}"

cd "${INSTALL_DIR}"
# shellcheck disable=SC1090
set -a
[[ -f "${INSTALL_DIR}/.env" ]] && source "${INSTALL_DIR}/.env"
set +a

# .env PORT=3010 prod API -- smoke instance ayri portta dinlemeli
export PORT="${SMOKE_PORT}"
export MESSAGING_SSE_INSTANCE_ID="${INSTANCE_ID}"

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete "${NAME}" 2>/dev/null || true
  PORT="${PORT}" MESSAGING_SSE_INSTANCE_ID="${INSTANCE_ID}" pm2 start npm --name "${NAME}" \
    --cwd "${INSTALL_DIR}" \
    --update-env \
    -- run start
  pm2 save
  echo "PM2: ${NAME} PORT=${PORT} MESSAGING_SSE_INSTANCE_ID=${INSTANCE_ID}"
else
  echo "HATA: pm2 gerekli" >&2
  exit 1
fi

sleep 5
if ! curl -fsS "http://127.0.0.1:${PORT}/api/v1/health" >/dev/null; then
  echo "HATA: smoke API http://127.0.0.1:${PORT}/api/v1/health yanit vermiyor" >&2
  echo "pm2 logs ${NAME} --lines 30" >&2
  exit 1
fi
curl -fsS "http://127.0.0.1:${PORT}/api/v1/health" | head -c 80
echo ""
echo "Smoke: SMOKE_SECOND_API_PORT=${PORT} API_BASE=https://app.lerta.com.tr/api/v1 \\"
echo "  bash scripts/run-prod-fs83-two-instance-smoke.sh"
