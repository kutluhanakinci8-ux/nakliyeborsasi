#!/usr/bin/env bash
# VPS .env: MESSAGING_WEBRTC_ICE_SERVERS (STUN varsayılan; TURN env ile eklenir)
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

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_ICE='[{"urls":"stun:stun.l.google.com:19302"}]'

# Opsiyonel: TURN_URL=turn:host:3478 TURN_USERNAME=... TURN_CREDENTIAL=...
export DEFAULT_ICE TURN_URL="${MESSAGING_TURN_URL:-${TURN_URL:-}}" \
  TURN_USERNAME="${MESSAGING_TURN_USERNAME:-${TURN_USERNAME:-}}" \
  TURN_CREDENTIAL="${MESSAGING_TURN_CREDENTIAL:-${TURN_CREDENTIAL:-}}"

ice_json="$(python3 <<'PY'
import json, os

servers = json.loads(os.environ["DEFAULT_ICE"])
turn_url = os.environ.get("TURN_URL", "").strip()
turn_user = os.environ.get("TURN_USERNAME", "").strip()
turn_cred = os.environ.get("TURN_CREDENTIAL", "").strip()
if turn_url and turn_user and turn_cred:
    servers.append({
        "urls": turn_url,
        "username": turn_user,
        "credential": turn_cred,
    })
print(json.dumps(servers, separators=(",", ":")))
PY
)"

if [[ -n "${MESSAGING_WEBRTC_ICE_SERVERS:-}" ]]; then
  ice_json="${MESSAGING_WEBRTC_ICE_SERVERS}"
  echo "OK: MESSAGING_WEBRTC_ICE_SERVERS ortamdan alındı (tam JSON)"
elif grep -q "^MESSAGING_WEBRTC_ICE_SERVERS=.\+" "${ENV_FILE}" 2>/dev/null; then
  if [[ -n "${TURN_URL:-}" && -n "${TURN_USERNAME:-}" && -n "${TURN_CREDENTIAL:-}" ]]; then
    echo "NOT: .env zaten ICE tanımlı — TURN eklemek için MESSAGING_WEBRTC_ICE_SERVERS'i elle güncelleyin veya satırı silip script'i TURN_* ile tekrar çalıştırın"
  else
    echo "SKIP: MESSAGING_WEBRTC_ICE_SERVERS zaten tanımlı"
    ice_json=""
  fi
fi

if [[ -n "${ice_json}" ]]; then
  set_kv "MESSAGING_WEBRTC_ICE_SERVERS" "${ice_json}"
  if [[ -n "${TURN_URL:-}" ]]; then
    echo "OK: STUN + TURN yazıldı"
  else
    echo "OK: STUN yazıldı — TURN: docs/messaging/WEBRTC-TURN-VPS.md veya TURN_URL/TURN_USERNAME/TURN_CREDENTIAL"
  fi
fi

if [[ -x "${INSTALL_DIR}/scripts/restart-api.sh" ]]; then
  bash "${INSTALL_DIR}/scripts/restart-api.sh" "${INSTALL_DIR}"
fi
echo "WebRTC ICE env tamam."
