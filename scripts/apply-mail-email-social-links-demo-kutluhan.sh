#!/usr/bin/env bash
# Geliştirme: kutluhan@kullanici.lerta.com.tr org için demo sosyal linkleri (yalnızca boşsa).
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
ORG_ID="${MAIL_DEMO_SOCIAL_ORG_ID:-2b6022fd-f187-4fef-ad4e-5bf586378313}"
FIXTURE="${INSTALL_DIR}/scripts/sql/fixtures/mail-email-social-links-lertatest-demo.json"

if [[ -f "${INSTALL_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${INSTALL_DIR}/.env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "SKIP: DATABASE_URL yok"
  exit 0
fi

LINKS_JSON="$(node -e "process.stdout.write(JSON.stringify(JSON.parse(require('fs').readFileSync('${FIXTURE}','utf8'))))")"
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c \
  "UPDATE mail_organization_branding SET email_social_links = '${LINKS_JSON}'::jsonb, \"updatedAt\" = NOW() WHERE \"organizationId\" = '${ORG_ID}'::uuid AND (email_social_links IS NULL OR jsonb_array_length(COALESCE(email_social_links, '[]'::jsonb)) = 0);"

echo "OK: demo sosyal linkler (org ${ORG_ID}) — yalnızca boşsa uygulandı"
