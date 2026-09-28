#!/usr/bin/env bash
# PM-9: AI compose bayrakları (VPS .env)
set -euo pipefail
ENV_FILE="${1:-/var/www/nakliyeborsasi/.env}"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ENV dosyası bulunamadı: ${ENV_FILE}" >&2
  exit 1
fi
# shellcheck disable=SC1090
source <(grep -E '^LERTA_MAIL_AI_COMPOSE_' "${ENV_FILE}" || true)
if [[ "${LERTA_MAIL_AI_COMPOSE_ENABLED:-}" != "true" ]]; then
  echo "NOT: LERTA_MAIL_AI_COMPOSE_ENABLED=true değil" >&2
  exit 2
fi
echo "OK: AI compose etkin."
if [[ -n "${LERTA_MAIL_AI_COMPOSE_API_KEY:-}" ]]; then
  echo "OK: API anahtarı tanımlı (LLM)."
elif [[ -n "${LERTA_MAIL_AI_COMPOSE_API_URL:-}" ]]; then
  echo "Bilgi: URL var, anahtar yok — şablon/compat URL denenebilir."
else
  echo "Bilgi: LLM URL/anahtar yok — şablon yanıt modu."
fi
