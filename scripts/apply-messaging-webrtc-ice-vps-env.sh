#!/usr/bin/env bash
# VPS .env: MESSAGING_WEBRTC_ICE_SERVERS (STUN varsayılan; TURN elle eklenir)
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "HATA: ${ENV_FILE} bulunamadı." >&2
  exit 1
fi

set_kv() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "${ENV_FILE}"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
  else
    echo "${key}=${value}" >> "${ENV_FILE}"
  fi
}

DEFAULT_ICE='[{"urls":"stun:stun.l.google.com:19302"}]'

if ! grep -q "^MESSAGING_WEBRTC_ICE_SERVERS=.\+" "${ENV_FILE}" 2>/dev/null; then
  set_kv "MESSAGING_WEBRTC_ICE_SERVERS" "${DEFAULT_ICE}"
  echo "OK: MESSAGING_WEBRTC_ICE_SERVERS (STUN) eklendi — TURN için docs/messaging/WEBRTC-TURN-VPS.md"
else
  echo "SKIP: MESSAGING_WEBRTC_ICE_SERVERS zaten tanımlı"
fi

if [[ -x "${INSTALL_DIR}/scripts/restart-api.sh" ]]; then
  bash "${INSTALL_DIR}/scripts/restart-api.sh" "${INSTALL_DIR}"
fi
echo "WebRTC ICE env tamam."
