#!/usr/bin/env bash
set -euo pipefail
INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
SQL_FILE="${INSTALL_DIR}/scripts/sql/mail-connected-accounts-cap3.sql"
# shellcheck source=/dev/null
source "${INSTALL_DIR}/.env" 2>/dev/null || true
: "${DATABASE_URL:?DATABASE_URL required}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
echo "OK: mail connected accounts CAP-3 schema"
