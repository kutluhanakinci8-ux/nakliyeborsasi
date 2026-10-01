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
  social-hub-phase-n.sql
  social-hub-phase-o.sql
  social-hub-phase-p.sql
  social-hub-phase-q.sql
  social-hub-phase-r.sql
  social-hub-phase-s.sql
  social-hub-phase-t.sql
  social-hub-phase-u.sql
  social-hub-phase-v.sql
  social-hub-phase-w.sql
  social-hub-phase-x.sql
  social-hub-phase-y.sql
  social-hub-phase-z.sql
  social-hub-phase-aa.sql
  social-hub-phase-ab.sql
  social-hub-phase-ac.sql
  social-hub-phase-ad.sql
  social-hub-phase-ae.sql
  social-hub-phase-af.sql
  social-hub-phase-ag.sql
  social-hub-phase-ah.sql
  social-hub-phase-ai.sql
  social-hub-phase-aj.sql
  social-hub-phase-ak.sql
  social-hub-phase-al.sql
  social-hub-phase-am.sql
  social-hub-phase-an.sql
  social-hub-phase-ao.sql
  social-hub-phase-ap.sql
  social-hub-phase-aq.sql
  social-hub-phase-ar.sql
  social-hub-phase-as.sql
  social-hub-phase-at.sql
  social-hub-phase-au.sql
  social-hub-phase-av.sql
  social-hub-phase-aw.sql
  social-hub-phase-ax.sql
  social-hub-phase-ay.sql
  social-hub-phase-az.sql
  social-hub-phase-ba.sql
)

for name in "${SQL_FILES[@]}"; do
  path="${INSTALL_DIR}/scripts/sql/${name}"
  if [[ -f "$path" ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$path"
    echo "OK: ${name}"
  fi
done
echo "OK: social hub prod schema bundle"
