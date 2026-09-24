#!/usr/bin/env bash
# Switch Nakliye Borsası API to production SMTP (local Postfix).
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

MAIL_PLATFORM_DOMAIN="${MAIL_PLATFORM_DOMAIN:-mail.lerta.tr}"
FROM_EMAIL="${MAIL_PLATFORM_FROM_EMAIL:-notifications@mail.lerta.tr}"
VPS_IP="${MAIL_PLATFORM_SPF_IPV4:-$(curl -fsS -4 --max-time 5 https://api.ipify.org 2>/dev/null || true)}"

set_kv() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "${ENV_FILE}"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
  else
    echo "${key}=${value}" >> "${ENV_FILE}"
  fi
}

set_kv "EMAIL_ENABLED" "true"
set_kv "SMTP_PROFILE" "custom"
set_kv "SMTP_HOST" "127.0.0.1"
set_kv "SMTP_PORT" "25"
set_kv "SMTP_SECURE" "false"
set_kv "SMTP_FROM" "Lerta Logistics <${FROM_EMAIL}>"
set_kv "MAIL_PLATFORM_DOMAIN" "${MAIL_PLATFORM_DOMAIN}"
set_kv "MAIL_PLATFORM_FROM_EMAIL" "${FROM_EMAIL}"
if [[ -n "${VPS_IP}" ]]; then
  set_kv "MAIL_PLATFORM_SPF_IPV4" "${VPS_IP}"
fi

echo "Updated ${ENV_FILE} for custom SMTP (127.0.0.1:25)."
echo "Ensure MAIL_PLATFORM_DKIM_TXT is set after setup-postfix-phase-a-lerta.sh"
echo "Restart API: cd ${INSTALL_DIR} && bash scripts/restart-api.sh"
