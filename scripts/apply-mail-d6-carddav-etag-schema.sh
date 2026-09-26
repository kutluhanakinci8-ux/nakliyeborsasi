#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
SQL_FILE="${INSTALL_DIR}/scripts/sql/mail-d6-carddav-etag.sql"
ENV_FILE="${INSTALL_DIR}/.env"

if [[ ! -f "$SQL_FILE" ]]; then
  echo "SQL dosyası yok: $SQL_FILE" >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo ".env yok — DATABASE_URL gerekli." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL tanımlı değil." >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
echo "OK: mail_org_contact.carddav_etag"
