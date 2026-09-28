#!/usr/bin/env bash
# PM-9: Lerta Mail AI yanıt önerisi (.env). API anahtarı opsiyonel (şablon modu).
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"
ENABLED="${LERTA_MAIL_AI_COMPOSE_ENABLED:-true}"
API_URL="${LERTA_MAIL_AI_COMPOSE_API_URL:-}"
API_KEY="${LERTA_MAIL_AI_COMPOSE_API_KEY:-}"
MODEL="${LERTA_MAIL_AI_COMPOSE_MODEL:-gpt-4o-mini}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
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

set_kv "LERTA_MAIL_AI_COMPOSE_ENABLED" "${ENABLED}"
if [[ -n "${API_URL}" ]]; then
  set_kv "LERTA_MAIL_AI_COMPOSE_API_URL" "${API_URL}"
fi
if [[ -n "${API_KEY}" ]]; then
  set_kv "LERTA_MAIL_AI_COMPOSE_API_KEY" "${API_KEY}"
fi
set_kv "LERTA_MAIL_AI_COMPOSE_MODEL" "${MODEL}"

echo "AI compose env yazıldı (${ENV_FILE})."
echo "Doğrulama: bash scripts/verify-mail-ai-compose-prod.sh ${ENV_FILE}"
echo "API restart: bash ${INSTALL_DIR}/scripts/restart-api.sh"
