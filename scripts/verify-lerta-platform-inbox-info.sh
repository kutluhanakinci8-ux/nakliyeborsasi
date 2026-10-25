#!/usr/bin/env bash
# Doğrula: admin bildirimleri yalnızca info@lerta.com.tr (veya LERTA_PLATFORM_INBOX_EMAIL).
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"
ENV_FILE="${ENV_FILE:-${INSTALL_DIR}/.env}"
EXPECTED="${LERTA_PLATFORM_INBOX_EMAIL:-info@lerta.com.tr}"
EXPECTED="${EXPECTED,,}"
fail=0

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "FAIL: ${ENV_FILE}" >&2
  exit 1
fi

check_env() {
  local key="$1"
  local val
  val="$(grep -E "^${key}=" "${ENV_FILE}" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' || true)"
  val="${val,,}"
  if [[ "${val}" == "${EXPECTED}" ]]; then
    echo "OK  ${key}=${EXPECTED}"
  else
    echo "NOT ${key} (got: ${val:-empty}, want: ${EXPECTED})" >&2
    fail=1
  fi
}

echo "=== .env ==="
check_env "LERTA_PLATFORM_INBOX_EMAIL"
check_env "PLATFORM_ADMIN_EMAILS"
check_env "PLATFORM_OPERATOR_EMAILS"

# shellcheck disable=SC1091
source <(grep -E '^DATABASE_URL=' "${ENV_FILE}")

echo ""
echo "=== DB adminRecipientEmails (distinct) ==="
psql "${DATABASE_URL}" -At -c \
  "SELECT DISTINCT jsonb_array_elements_text(\"adminRecipientEmails\") FROM platform_notification_settings ORDER BY 1;"

bad="$(psql "${DATABASE_URL}" -At -c \
  "SELECT count(*) FROM platform_notification_settings s, jsonb_array_elements_text(s.\"adminRecipientEmails\") e WHERE lower(e) <> '${EXPECTED}';")"
if [[ "${bad}" != "0" ]]; then
  echo "NOT: platform_notification_settings içinde başka alıcı var" >&2
  fail=1
else
  echo "OK: Tüm event admin alıcıları ${EXPECTED}"
fi

if [[ "${fail}" -eq 0 ]]; then
  echo "VERIFY: PASS"
  exit 0
fi
echo "VERIFY: FAIL — bash scripts/pin-lerta-platform-inbox-info.sh"
exit 2
