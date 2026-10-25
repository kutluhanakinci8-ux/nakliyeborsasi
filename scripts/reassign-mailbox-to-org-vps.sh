#!/usr/bin/env bash
# Tek mailbox + gönderen kimliğini başka organizasyona taşı (platform info@ → admin org).
set -euo pipefail

EMAIL="${1:-}"
TO_ORG_ID="${2:-}"

INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"
ENV_FILE="${ENV_FILE:-${INSTALL_DIR}/.env}"

if [[ -z "${EMAIL}" || -z "${TO_ORG_ID}" ]]; then
  echo "Kullanım: $0 <mailbox@domain> <hedef-org-uuid>" >&2
  exit 1
fi

EMAIL="${EMAIL,,}"

# shellcheck disable=SC1091
source <(grep -E '^DATABASE_URL=' "${ENV_FILE}")

FROM_ORG="$(psql "${DATABASE_URL}" -At -c \
  "SELECT \"organizationId\" FROM mail_mailbox WHERE lower(\"emailAddress\")='${EMAIL}' LIMIT 1;")"
if [[ -z "${FROM_ORG}" ]]; then
  echo "FAIL: mailbox yok: ${EMAIL}" >&2
  exit 2
fi
if [[ "${FROM_ORG}" == "${TO_ORG_ID}" ]]; then
  echo "OK: zaten bu org'da (${TO_ORG_ID})"
  exit 0
fi

LOCAL="${EMAIL%@*}"
DOMAIN="${EMAIL#*@}"

echo "Taşıma: ${EMAIL} org ${FROM_ORG} → ${TO_ORG_ID}"

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 <<SQL
BEGIN;
UPDATE mail_mailbox
SET "organizationId" = '${TO_ORG_ID}'::uuid
WHERE lower("emailAddress") = '${EMAIL}';

UPDATE mail_imap_credential
SET "organizationId" = '${TO_ORG_ID}'::uuid
WHERE lower("emailAddress") = '${EMAIL}';

UPDATE mail_sender_identity si
SET "organizationId" = '${TO_ORG_ID}'::uuid
FROM mail_domains md
WHERE si."mailDomainId" = md.id
  AND md.domain = '${DOMAIN}'
  AND si."localPart" = '${LOCAL}';
COMMIT;
SQL

echo "OK: ${EMAIL} → org ${TO_ORG_ID}"
