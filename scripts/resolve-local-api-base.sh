#!/usr/bin/env bash
# VPS/lokal: .env içindeki PORT ile API_BASE üretir (varsayılan 3010 prod, 3000 dev).
set -euo pipefail

INSTALL_DIR="${1:-${INSTALL_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}}"
ENV_FILE="${ENV_FILE:-${INSTALL_DIR}/.env}"
PORT="${API_PORT:-}"

if [[ -z "${PORT}" ]] && [[ -f "${ENV_FILE}" ]]; then
  PORT="$(grep -E '^PORT=' "${ENV_FILE}" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r' || true)"
fi

PORT="${PORT:-3010}"
export API_PORT="${PORT}"
export API_BASE="${API_BASE:-http://127.0.0.1:${PORT}/api/v1}"

FALLBACK="${QA_FALLBACK_API_BASE:-https://yonetim.lerta.com.tr/api/v1}"
if ! curl -fsS --connect-timeout 3 "${API_BASE}/health" >/dev/null 2>&1; then
  if curl -fsS --connect-timeout 5 "${FALLBACK}/health" >/dev/null 2>&1; then
    export API_BASE="${FALLBACK}"
  fi
fi
