#!/usr/bin/env bash
# Tek platform yönetici kutusu: tüm admin bildirimleri info@lerta.com.tr (VPS .env + DB).
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"
ENV_FILE="${ENV_FILE:-${INSTALL_DIR}/.env}"
INBOX="${LERTA_PLATFORM_INBOX_EMAIL:-info@lerta.com.tr}"
INBOX="${INBOX,,}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

set_kv() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
  else
    echo "${key}=${value}" >> "${ENV_FILE}"
  fi
}

echo "=== .env ==="
set_kv "LERTA_PLATFORM_INBOX_EMAIL" "${INBOX}"
set_kv "PLATFORM_ADMIN_EMAILS" "${INBOX}"
set_kv "PLATFORM_OPERATOR_EMAILS" "${INBOX}"
set_kv "MAIL_PLATFORM_REPLY_TO" "${INBOX}"
set_kv "MAIL_WEB_PUSH_VAPID_SUBJECT" "mailto:${INBOX}"

# shellcheck disable=SC1091
source <(grep -E '^DATABASE_URL=' "${ENV_FILE}")

echo "=== platform_notification_settings ==="
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 <<SQL
UPDATE platform_notification_settings
SET "adminRecipientEmails" = jsonb_build_array('${INBOX}');
SQL

echo "OK: Platform inbox pinned to ${INBOX}"
echo "Sonraki: bash scripts/restart-api.sh && bash scripts/verify-lerta-platform-inbox-info.sh"
