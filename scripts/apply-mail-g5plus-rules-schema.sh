#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
SQL_FILE="${INSTALL_DIR}/scripts/sql/mail-g5plus-inbox-rules.sql"
ENV_FILE="${INSTALL_DIR}/.env"

[[ -f "$SQL_FILE" ]] || { echo "SQL yok: $SQL_FILE" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo ".env yok" >&2; exit 1; }

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

[[ -n "${DATABASE_URL:-}" ]] || { echo "DATABASE_URL gerekli" >&2; exit 1; }

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
echo "OK: mail_inbox_rule G5+"
