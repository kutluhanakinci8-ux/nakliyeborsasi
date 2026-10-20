#!/usr/bin/env bash
set -euo pipefail
INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
SQL="${INSTALL_DIR}/scripts/sql/mail-organization-branding-social.sql"
if [[ ! -f "$SQL" ]]; then
  echo "Missing $SQL" >&2
  exit 1
fi
if [[ -z "${DATABASE_URL:-}" && -f "${INSTALL_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${INSTALL_DIR}/.env"
  set +a
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL required" >&2
  exit 1
fi
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL"
echo "OK: mail_organization_branding.email_social_links"
