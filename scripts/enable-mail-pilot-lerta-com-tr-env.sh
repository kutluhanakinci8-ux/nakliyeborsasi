#!/usr/bin/env bash
# VPS .env — lerta.com.tr mail pilot (lerta.tr üretimine dokunmaz).
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"
APP_HOST="${APP_HOST:-posta.lerta.com.tr}"
VPS_IP="${MAIL_PLATFORM_SPF_IPV4:-168.231.109.27}"

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

set_kv "MAIL_PLATFORM_DOMAIN" "mail.lerta.com.tr"
set_kv "MAIL_PLATFORM_FROM_EMAIL" "notifications@mail.lerta.com.tr"
set_kv "MAIL_PLATFORM_TENANT_DOMAIN" "lerta.com.tr"
set_kv "MAIL_INBOUND_VIRTUAL_DOMAINS" "lerta.com.tr,kullanici.lerta.com.tr"
set_kv "MAIL_IMAP_HOST" "mail.lerta.com.tr"
set_kv "WEB_PUBLIC_BASE_URL" "https://${APP_HOST}"
set_kv "MAIL_SAAS_WEB_URL" "https://${APP_HOST}"
set_kv "SMTP_FROM" "Lerta Logistics <notifications@mail.lerta.com.tr>"
set_kv "MAIL_PLATFORM_SPF_IPV4" "${VPS_IP}"
set_kv "MAIL_INBOUND_APPLY_POSTFIX" "true"
set_kv "MAIL_IMAP_APPLY_DOVECOT" "true"
set_kv "MAIL_IMAP_MAILDIR_ROOT" "/var/mail/vhosts"

# Platform /admin ve mail operatörleri (virgülle birden fazla)
if [[ -n "${PLATFORM_OPERATOR_EMAILS:-}" ]]; then
  set_kv "PLATFORM_OPERATOR_EMAILS" "${PLATFORM_OPERATOR_EMAILS}"
fi

# DNS’teki tenant DKIM TXT (VPS default.txt ile aynı olmalı)
if [[ -n "${MAIL_PLATFORM_TENANT_DKIM_TXT:-}" ]]; then
  set_kv "MAIL_PLATFORM_TENANT_DKIM_TXT" "${MAIL_PLATFORM_TENANT_DKIM_TXT}"
fi

echo "Pilot mail env yazıldı: ${ENV_FILE}"
echo "Sonra: bash ${INSTALL_DIR}/scripts/setup-mail-lerta-com-tr-pilot.sh"
echo "      bash ${INSTALL_DIR}/scripts/restart-api.sh"
echo "      bash ${INSTALL_DIR}/scripts/restart-web.sh ${INSTALL_DIR} 3011 https://${APP_HOST}/api/v1"
