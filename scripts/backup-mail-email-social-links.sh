#!/usr/bin/env bash
# Deploy öncesi: mail_organization_branding.email_social_links yedeği (geri yükleme için).
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
BACKUP_ROOT="${INSTALL_DIR}/backups/mail-email-social-links"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

if [[ -f "${INSTALL_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${INSTALL_DIR}/.env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "SKIP: DATABASE_URL yok — sosyal link yedeği atlandı"
  exit 0
fi

mkdir -p "${BACKUP_ROOT}"
OUT="${BACKUP_ROOT}/email_social_links-${STAMP}.jsonl"
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -At -c \
  "COPY (
    SELECT json_build_object(
      'organizationId', \"organizationId\",
      'email_social_links', email_social_links,
      'updatedAt', \"updatedAt\"
    )::text
    FROM mail_organization_branding
    WHERE email_social_links IS NOT NULL
      AND jsonb_array_length(email_social_links) > 0
  ) TO STDOUT" > "${OUT}"

COUNT="$(wc -l < "${OUT}" | tr -d ' ')"
echo "OK: mail email_social_links backup → ${OUT} (${COUNT} org)"

# Son 30 yedeği tut
ls -1t "${BACKUP_ROOT}"/email_social_links-*.jsonl 2>/dev/null | tail -n +31 | xargs -r rm -f
