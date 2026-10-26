#!/usr/bin/env bash
# VPS .env: TWILIO_WHATSAPP_CONTENT_SID (WA 21654 önleme) — değer elle girilir.
set -euo pipefail
ENV_FILE="${1:-/var/www/nakliyeborsasi/.env}"
CONTENT_SID="${TWILIO_WHATSAPP_CONTENT_SID:-}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ENV dosyası bulunamadı: ${ENV_FILE}" >&2
  exit 1
fi

if [[ -z "${CONTENT_SID}" ]]; then
  echo "NOT: TWILIO_WHATSAPP_CONTENT_SID ortam değişkeni boş — export edip tekrar çalıştırın" >&2
  echo "Örnek: TWILIO_WHATSAPP_CONTENT_SID=HX... sudo -E bash $0 ${ENV_FILE}" >&2
  exit 2
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

set_kv "TWILIO_WHATSAPP_CONTENT_SID" "${CONTENT_SID}"
echo "OK: TWILIO_WHATSAPP_CONTENT_SID yazıldı — API yeniden başlatın"
