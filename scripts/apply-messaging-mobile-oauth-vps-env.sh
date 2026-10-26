#!/usr/bin/env bash
# VPS: Lerta mobil OAuth köprüsü (password grant → JWT).
set -euo pipefail
ENV_FILE="${1:-/var/www/nakliyeborsasi/.env}"
API_PUBLIC="${API_PUBLIC_BASE_URL:-https://u88.lerta.com.tr/api/v1}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ENV dosyası bulunamadı: ${ENV_FILE}" >&2
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

set_kv "MOBILE_OAUTH_LERTA_BRIDGE" "1"
set_kv "API_PUBLIC_BASE_URL" "${API_PUBLIC}"
set_kv "MOBILE_OAUTH_LERTA_CLIENT_ID" "${MOBILE_OAUTH_LERTA_CLIENT_ID:-lerta-mobile-native}"
echo "OK: MOBILE_OAUTH_LERTA_BRIDGE — token: ${API_PUBLIC}/auth/mobile/token"
echo "Discovery: ${API_PUBLIC}/auth/mobile/.well-known/openid-configuration"
