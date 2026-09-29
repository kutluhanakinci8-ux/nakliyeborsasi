#!/usr/bin/env bash
# VPS: parity wave-2 + FS-1 öncesi SQL (idempotent).
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "SKIP: .env yok — ${0##*/}"
  exit 0
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "SKIP: DATABASE_URL yok — ${0##*/}"
  exit 0
fi

for rel in \
  scripts/sql/user-notification-push-prefs.sql \
  scripts/sql/user-ai-mail-consent.sql \
  scripts/sql/mail-mailbox-legal-hold.sql \
  scripts/sql/mail-org-contact-groups-photo.sql \
  scripts/sql/trust-review-invite-table.sql
do
  file="${INSTALL_DIR}/${rel}"
  if [[ ! -f "$file" ]]; then
    echo "SKIP: $rel"
    continue
  fi
  echo "== $rel =="
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done

echo "OK: parity wave-2 schema"
