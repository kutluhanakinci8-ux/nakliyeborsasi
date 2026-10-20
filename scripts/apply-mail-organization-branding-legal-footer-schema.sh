#!/usr/bin/env bash
set -euo pipefail
INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
SQL_FILE="${INSTALL_DIR}/scripts/sql/mail-organization-branding-legal-footer.sql"
ENV_FILE="${INSTALL_DIR}/.env"
[[ -f "$SQL_FILE" && -f "$ENV_FILE" ]] || exit 0
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
[[ -n "${DATABASE_URL:-}" ]] || exit 0
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
echo "OK: mail_organization_branding.email_legal_footer"
