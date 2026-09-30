#!/usr/bin/env bash
set -euo pipefail
INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"
[[ -f "$ENV_FILE" ]] || exit 0
# shellcheck disable=SC1090
source "$ENV_FILE"
[[ -n "${DATABASE_URL:-}" ]] || exit 0

SQL_FILES=(
  social-hub-tables.sql
  social-hub-thread-links.sql
  social-hub-post-approval.sql
  social-hub-subscription-module.sql
  social-hub-oauth-states.sql
  social-hub-phase-f.sql
  social-hub-phase-i.sql
  social-hub-phase-jk.sql
  social-hub-phase-l.sql
  social-hub-phase-m.sql
)

for name in "${SQL_FILES[@]}"; do
  path="${INSTALL_DIR}/scripts/sql/${name}"
  if [[ -f "$path" ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$path"
    echo "OK: ${name}"
  fi
done
echo "OK: social hub prod schema bundle"
