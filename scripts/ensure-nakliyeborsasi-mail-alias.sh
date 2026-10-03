#!/usr/bin/env bash
# nakliyeborsasi@lerta.com.tr → mevcut lerta@ (veya birincil) kutusuna alias ekler.
# Instagram doğrulama kodları eski adrese giderse gelen kutuda görünür.
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"
ENV_FILE="${ENV_FILE:-${INSTALL_DIR}/.env}"
ALIAS_LOCAL="${ALIAS_LOCAL:-nakliyeborsasi}"
TARGET_EMAIL="${TARGET_EMAIL:-lerta@lerta.com.tr}"
TENANT_DOMAIN="${MAIL_PLATFORM_TENANT_DOMAIN:-lerta.com.tr}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL missing" >&2
  exit 1
fi

TARGET_LC="$(echo "${TARGET_EMAIL}" | tr '[:upper:]' '[:lower:]')"
ALIAS_EMAIL="${ALIAS_LOCAL}@${TENANT_DOMAIN}"

echo "=== Ensure alias ${ALIAS_EMAIL} → ${TARGET_LC} ==="

ORG_ID="$(psql "${DATABASE_URL}" -At -v ON_ERROR_STOP=1 -c \
  "SELECT \"organizationId\" FROM mail_mailbox WHERE lower(\"emailAddress\")='${TARGET_LC}' LIMIT 1;")"
if [[ -z "${ORG_ID}" ]]; then
  echo "FAIL: hedef mailbox yok: ${TARGET_LC}" >&2
  exit 1
fi

MAILBOX_ID="$(psql "${DATABASE_URL}" -At -v ON_ERROR_STOP=1 -c \
  "SELECT id FROM mail_mailbox WHERE \"organizationId\"='${ORG_ID}'::uuid AND lower(\"emailAddress\")='${TARGET_LC}' LIMIT 1;")"

DOMAIN_ID="$(psql "${DATABASE_URL}" -At -v ON_ERROR_STOP=1 -c \
  "SELECT id FROM mail_domains WHERE domain='${TENANT_DOMAIN}' LIMIT 1;")"
if [[ -z "${DOMAIN_ID}" ]]; then
  echo "FAIL: mail_domains kaydı yok: ${TENANT_DOMAIN}" >&2
  exit 1
fi

EXISTING="$(psql "${DATABASE_URL}" -At -c \
  "SELECT id FROM mail_address_alias WHERE lower(\"aliasEmail\")='${ALIAS_EMAIL}' LIMIT 1;" || true)"
if [[ -n "${EXISTING}" ]]; then
  echo "Alias zaten var: ${ALIAS_EMAIL} (id=${EXISTING})"
else
  ALIAS_ID="$(psql "${DATABASE_URL}" -At -v ON_ERROR_STOP=1 -c \
    "INSERT INTO mail_address_alias (id, \"organizationId\", \"mailDomainId\", \"localPart\", \"aliasEmail\", label, \"createdAt\", \"updatedAt\")
     VALUES (gen_random_uuid(), '${ORG_ID}'::uuid, '${DOMAIN_ID}'::uuid, '${ALIAS_LOCAL}', '${ALIAS_EMAIL}', 'Instagram / legacy', NOW(), NOW())
     RETURNING id;")"
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c \
    "INSERT INTO mail_address_alias_target (id, \"aliasId\", \"mailboxId\", \"createdAt\")
     VALUES (gen_random_uuid(), '${ALIAS_ID}'::uuid, '${MAILBOX_ID}'::uuid, NOW());"
  echo "Alias oluşturuldu: ${ALIAS_EMAIL}"
fi

if [[ "${MAIL_INBOUND_APPLY_POSTFIX:-}" == "true" ]]; then
  echo "Postfix sync için API yeniden başlatın veya mail inbound routing sync çalıştırın."
fi

psql "${DATABASE_URL}" -c \
  "SELECT alias.\"aliasEmail\", mb.\"emailAddress\" AS target
   FROM mail_address_alias alias
   JOIN mail_address_alias_target t ON t.\"aliasId\" = alias.id
   JOIN mail_mailbox mb ON mb.id = t.\"mailboxId\"
   WHERE alias.\"organizationId\"='${ORG_ID}'::uuid;"
