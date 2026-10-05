#!/usr/bin/env bash
# Tek organizasyon kutusunu nakliyeborsasi@lerta.com.tr → lerta@lerta.com.tr yapar.
# Gönderen kimliği, IMAP credential, maildir ve Postfix virtual map güncellenir.
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"
ENV_FILE="${ENV_FILE:-${INSTALL_DIR}/.env}"
FROM_EMAIL="${FROM_EMAIL:-nakliyeborsasi@lerta.com.tr}"
TO_EMAIL="${TO_EMAIL:-lerta@lerta.com.tr}"
TENANT_DOMAIN="${MAIL_PLATFORM_TENANT_DOMAIN:-lerta.com.tr}"
API_BASE="${API_BASE:-https://app.lerta.com.tr/api/v1}"
PLATFORM_EMAIL="${PLATFORM_OPERATOR_LOGIN_EMAIL:-admin@lerta.tr}"
PLATFORM_PASSWORD="${PLATFORM_OPERATOR_LOGIN_PASSWORD:-}"

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

FROM_LC="$(echo "${FROM_EMAIL}" | tr '[:upper:]' '[:lower:]')"
TO_LC="$(echo "${TO_EMAIL}" | tr '[:upper:]' '[:lower:]')"
FROM_LOCAL="${FROM_LC%@*}"
TO_LOCAL="${TO_LC%@*}"
TO_DOMAIN="${TO_LC#*@}"

if [[ "${TO_DOMAIN}" != "${TENANT_DOMAIN}" ]]; then
  echo "TO_EMAIL domain must be ${TENANT_DOMAIN}" >&2
  exit 1
fi

MAILDIR_ROOT="${MAIL_IMAP_MAILDIR_ROOT:-/var/mail/vhosts}"

echo "=== Migrate mailbox ${FROM_LC} → ${TO_LC} ==="

ORG_ID="$(psql "${DATABASE_URL}" -At -v ON_ERROR_STOP=1 -c \
  "SELECT \"organizationId\" FROM mail_mailbox WHERE lower(\"emailAddress\")='${FROM_LC}' LIMIT 1;")"
if [[ -z "${ORG_ID}" ]]; then
  echo "FAIL: kaynak mailbox bulunamadı: ${FROM_LC}" >&2
  exit 1
fi

EXISTING_TO="$(psql "${DATABASE_URL}" -At -c \
  "SELECT \"organizationId\" FROM mail_mailbox WHERE lower(\"emailAddress\")='${TO_LC}' LIMIT 1;" || true)"
if [[ -n "${EXISTING_TO}" && "${EXISTING_TO}" != "${ORG_ID}" ]]; then
  echo "FAIL: ${TO_LC} başka bir organizasyona ait." >&2
  exit 1
fi

TAKEN_SENDER="$(psql "${DATABASE_URL}" -At -c \
  "SELECT si.\"organizationId\" FROM mail_sender_identity si
   JOIN mail_domains md ON md.id = si.\"mailDomainId\"
   WHERE md.domain='${TENANT_DOMAIN}' AND si.\"localPart\"='${TO_LOCAL}'
   AND si.\"organizationId\" <> '${ORG_ID}'::uuid LIMIT 1;")"
if [[ -n "${TAKEN_SENDER}" ]]; then
  echo "FAIL: ${TO_LOCAL}@${TENANT_DOMAIN} başka firmada kullanılıyor." >&2
  exit 1
fi

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 <<SQL
BEGIN;

UPDATE mail_mailbox
SET "emailAddress" = '${TO_LC}'
WHERE "organizationId" = '${ORG_ID}'::uuid
  AND lower("emailAddress") = '${FROM_LC}';

UPDATE mail_imap_credential
SET "emailAddress" = '${TO_LC}'
WHERE "organizationId" = '${ORG_ID}'::uuid
  AND lower("emailAddress") = '${FROM_LC}';

UPDATE mail_sender_identity si
SET "localPart" = '${TO_LOCAL}',
    "isDefault" = true,
    "displayName" = COALESCE(NULLIF(trim(si."displayName"), ''), 'Lerta')
FROM mail_domains md
WHERE si."mailDomainId" = md.id
  AND md.domain = '${TENANT_DOMAIN}'
  AND si."organizationId" = '${ORG_ID}'::uuid
  AND si."localPart" = '${FROM_LOCAL}';

-- Eski localPart yoksa (sadece kutu varsa) gönderen oluştur
INSERT INTO mail_sender_identity (id, "mailDomainId", "organizationId", "localPart", "displayName", "purpose", "isDefault", "createdAt", "updatedAt")
SELECT uuid_generate_v4(), md.id, '${ORG_ID}'::uuid, '${TO_LOCAL}', 'Lerta', 'transactional', true, now(), now()
FROM mail_domains md
WHERE md.domain = '${TENANT_DOMAIN}'
  AND NOT EXISTS (
    SELECT 1 FROM mail_sender_identity si2
    WHERE si2."organizationId" = '${ORG_ID}'::uuid
      AND si2."mailDomainId" = md.id
      AND si2."localPart" = '${TO_LOCAL}'
  );

UPDATE mail_sender_identity si
SET "isDefault" = false
WHERE si."organizationId" = '${ORG_ID}'::uuid
  AND si."localPart" <> '${TO_LOCAL}'
  AND si."mailDomainId" IN (SELECT id FROM mail_domains WHERE domain = '${TENANT_DOMAIN}');

COMMIT;
SQL

OLD_DIR="${MAILDIR_ROOT}/${TENANT_DOMAIN}/${FROM_LOCAL}"
NEW_DIR="${MAILDIR_ROOT}/${TENANT_DOMAIN}/${TO_LOCAL}"
if [[ -d "${OLD_DIR}" && ! -d "${NEW_DIR}" ]]; then
  echo "==> maildir: ${OLD_DIR} → ${NEW_DIR}"
  mv "${OLD_DIR}" "${NEW_DIR}"
  if id vmail &>/dev/null; then
    chown -R vmail:mail "${NEW_DIR}" 2>/dev/null || true
  fi
elif [[ ! -d "${NEW_DIR}" ]]; then
  echo "==> maildir iskelet: ${NEW_DIR}"
  for sub in new cur tmp .Sent/cur .Sent/new .Archive/new .Trash/new .Junk/new; do
    mkdir -p "${NEW_DIR}/Maildir/${sub}"
  done
  if id vmail &>/dev/null; then
    chown -R vmail:mail "${MAILDIR_ROOT}/${TENANT_DOMAIN}/${TO_LOCAL}" 2>/dev/null || true
  fi
fi

if [[ "${MAIL_IMAP_APPLY_DOVECOT:-}" == "true" ]]; then
  echo "==> Dovecot passwd sync"
  bash "${INSTALL_DIR}/scripts/provision-pm5-imap-dovecot-vps.sh" || true
fi

if [[ -n "${PLATFORM_PASSWORD}" ]]; then
  echo "==> Postfix inbound routing sync"
  PLATFORM_TOKEN="$(curl -sf -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"emailAddress\":\"${PLATFORM_EMAIL}\",\"password\":\"${PLATFORM_PASSWORD}\"}" | jq -r .accessToken)"
  if [[ -n "${PLATFORM_TOKEN}" && "${PLATFORM_TOKEN}" != "null" ]]; then
    curl -sf -X POST "${API_BASE}/platform-admin/mail/inbound-routing/sync-postfix" \
      -H "Authorization: Bearer ${PLATFORM_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{}" >/dev/null
    echo "OK: postfix virtual map synced"
  else
    echo "WARN: platform login failed — pm2 restart API veya admin sync-postfix"
  fi
else
  echo "SKIP: PLATFORM_OPERATOR_LOGIN_PASSWORD yok — API restart sonrası Postfix sync"
  if command -v pm2 >/dev/null; then
    pm2 restart nakliyeborsasi-api 2>/dev/null || true
  fi
fi

echo "=== Tamam: ${TO_LC} (org ${ORG_ID}) ==="
psql "${DATABASE_URL}" -At -c \
  "SELECT 'mailbox', \"emailAddress\" FROM mail_mailbox WHERE \"organizationId\"='${ORG_ID}'::uuid;
   SELECT 'sender', si.\"localPart\"||'@'||md.domain FROM mail_sender_identity si JOIN mail_domains md ON md.id=si.\"mailDomainId\" WHERE si.\"organizationId\"='${ORG_ID}'::uuid;"
