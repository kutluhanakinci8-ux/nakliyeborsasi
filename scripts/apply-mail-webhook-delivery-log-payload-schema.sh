#!/usr/bin/env bash
set -euo pipefail
INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
SQL_FILE="${INSTALL_DIR}/scripts/sql/mail-webhook-delivery-log-payload.sql"
ENV_FILE="${INSTALL_DIR}/.env"
[[ -f "$SQL_FILE" && -f "$ENV_FILE" ]] || { echo "SQL veya .env eksik" >&2; exit 1; }
set -a; source "$ENV_FILE"; set +a
[[ -n "${DATABASE_URL:-}" ]] || { echo "DATABASE_URL gerekli" >&2; exit 1; }
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
echo "OK: mail_webhook_delivery_log.payload_body"
