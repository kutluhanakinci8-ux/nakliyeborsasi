#!/usr/bin/env bash
set -euo pipefail
INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
SQL="${INSTALL_DIR}/scripts/sql/messaging-fs8-company-search.sql"
ENV_FILE="${INSTALL_DIR}/.env"
[[ -f "$ENV_FILE" ]] || exit 0
# shellcheck disable=SC1090
source "$ENV_FILE"
[[ -n "${DATABASE_URL:-}" ]] || exit 0
[[ -f "$SQL" ]] || exit 0
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL"
echo "OK: messaging FS-8 schema"
