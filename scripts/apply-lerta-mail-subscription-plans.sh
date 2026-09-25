#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
SQL_FILE="${INSTALL_DIR}/scripts/sql/lerta-mail-subscription-plans.sql"
ENV_FILE="${INSTALL_DIR}/.env"

if [[ ! -f "$SQL_FILE" || ! -f "$ENV_FILE" ]]; then
  echo "SQL veya .env eksik — atlanıyor." >&2
  exit 0
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  exit 0
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
echo "OK: lerta_mail subscription plans"
