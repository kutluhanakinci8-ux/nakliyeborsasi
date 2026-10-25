#!/usr/bin/env bash
# Lerta Posta: yönetici giriş e-postası + info@lerta.com.tr kutusu hizalama (VPS, psql).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"
ENV_FILE="${ENV_FILE:-${INSTALL_DIR}/.env}"

OLD_LOGIN_EMAIL="${OLD_LOGIN_EMAIL:-}"
ADMIN_MAILBOX="${ADMIN_MAILBOX:-info@lerta.com.tr}"
ADMIN_DISPLAY_NAME="${ADMIN_DISPLAY_NAME:-Lerta Platform}"
TARGET_ORG_ID="${TARGET_ORG_ID:-}"
TENANT_DOMAIN="${MAIL_PLATFORM_TENANT_DOMAIN:-lerta.com.tr}"

if [[ -z "${OLD_LOGIN_EMAIL}" ]]; then
  echo "OLD_LOGIN_EMAIL gerekli (ör. a.kutluhan@msn.com)" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

# shellcheck disable=SC1091
source <(grep -E '^DATABASE_URL=' "${ENV_FILE}")

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL missing" >&2
  exit 1
fi

OLD_LOGIN_EMAIL="${OLD_LOGIN_EMAIL,,}"
ADMIN_MAILBOX="${ADMIN_MAILBOX,,}"
ADMIN_LOCAL="${ADMIN_MAILBOX%@*}"
ADMIN_DOMAIN="${ADMIN_MAILBOX#*@}"

if [[ "${ADMIN_DOMAIN}" != "${TENANT_DOMAIN}" ]]; then
  echo "ADMIN_MAILBOX domain ${ADMIN_DOMAIN} != MAIL_PLATFORM_TENANT_DOMAIN ${TENANT_DOMAIN}" >&2
  exit 1
fi

set_kv_env() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
  else
    echo "${key}=${value}" >> "${ENV_FILE}"
  fi
}

append_env_list() {
  local key="$1"
  local email="$2"
  email="${email,,}"
  local current
  current="$(grep -E "^${key}=" "${ENV_FILE}" 2>/dev/null | head -1 | cut -d= -f2- || true)"
  if [[ -z "${current}" ]]; then
    set_kv_env "${key}" "${email}"
    return
  fi
  if echo "${current}" | tr ',;' '\n' | grep -qi "^${email}$"; then
    return
  fi
  set_kv_env "${key}" "${current},${email}"
}

echo "=== Giriş kullanıcısı: ${OLD_LOGIN_EMAIL} ==="
USER_ID="$(psql "${DATABASE_URL}" -At -c \
  "SELECT id FROM user_accounts WHERE lower(\"emailAddress\")='${OLD_LOGIN_EMAIL}' LIMIT 1;")"
if [[ -z "${USER_ID}" ]]; then
  echo "FAIL: user_accounts bulunamadı: ${OLD_LOGIN_EMAIL}" >&2
  exit 1
fi

if [[ -z "${TARGET_ORG_ID}" ]]; then
  TARGET_ORG_ID="$(psql "${DATABASE_URL}" -At -c \
    "SELECT \"companyId\" FROM company_memberships WHERE \"userId\"='${USER_ID}'::uuid ORDER BY \"createdAt\" LIMIT 1;")"
fi
if [[ -z "${TARGET_ORG_ID}" ]]; then
  echo "FAIL: TARGET_ORG_ID / company_memberships bulunamadı" >&2
  exit 1
fi
echo "Hedef organizasyon: ${TARGET_ORG_ID}"

EXISTING_INFO_ORG="$(psql "${DATABASE_URL}" -At -c \
  "SELECT \"organizationId\" FROM mail_mailbox WHERE lower(\"emailAddress\")='${ADMIN_MAILBOX}' LIMIT 1;" || true)"
if [[ -n "${EXISTING_INFO_ORG}" && "${EXISTING_INFO_ORG}" != "${TARGET_ORG_ID}" ]]; then
  echo "FAIL: ${ADMIN_MAILBOX} başka org'a ait (${EXISTING_INFO_ORG}). TARGET_ORG_ID veya mailbox taşıma gerekir." >&2
  exit 1
fi

DOMAIN_ID="$(psql "${DATABASE_URL}" -At -c \
  "SELECT id FROM mail_domains WHERE domain='${TENANT_DOMAIN}' LIMIT 1;")"
if [[ -z "${DOMAIN_ID}" ]]; then
  echo "FAIL: mail_domains ${TENANT_DOMAIN} yok — önce provision-lerta-com-tr-existing-orgs.sh" >&2
  exit 1
fi

display_escaped="${ADMIN_DISPLAY_NAME//\'/\'\'}"

echo "=== Kutu + gönderen: ${ADMIN_MAILBOX} ==="
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO mail_mailbox (id, "organizationId", "emailAddress", status, "quotaBytes", "createdAt", "updatedAt")
SELECT uuid_generate_v4(), '${TARGET_ORG_ID}'::uuid, '${ADMIN_MAILBOX}', 'active', 0, now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM mail_mailbox WHERE "organizationId"='${TARGET_ORG_ID}'::uuid AND lower("emailAddress")='${ADMIN_MAILBOX}'
);

INSERT INTO mail_sender_identity (id, "mailDomainId", "organizationId", "localPart", "displayName", purpose, "isDefault", "createdAt", "updatedAt")
SELECT uuid_generate_v4(), '${DOMAIN_ID}'::uuid, '${TARGET_ORG_ID}'::uuid, '${ADMIN_LOCAL}', '${display_escaped}', 'transactional', true, now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM mail_sender_identity si
  WHERE si."organizationId"='${TARGET_ORG_ID}'::uuid AND si."mailDomainId"='${DOMAIN_ID}'::uuid AND si."localPart"='${ADMIN_LOCAL}'
);

UPDATE mail_sender_identity si
SET "isDefault" = true, "displayName" = '${display_escaped}'
FROM mail_domains md
WHERE si."mailDomainId" = md.id AND md.domain = '${TENANT_DOMAIN}'
  AND si."organizationId" = '${TARGET_ORG_ID}'::uuid AND si."localPart" = '${ADMIN_LOCAL}';

UPDATE mail_sender_identity si
SET "isDefault" = false
FROM mail_domains md
WHERE si."mailDomainId" = md.id AND md.domain = '${TENANT_DOMAIN}'
  AND si."organizationId" = '${TARGET_ORG_ID}'::uuid AND si."localPart" <> '${ADMIN_LOCAL}';
SQL

OTHER_USER="$(psql "${DATABASE_URL}" -At -c \
  "SELECT id FROM user_accounts WHERE lower(\"emailAddress\")='${ADMIN_MAILBOX}' AND id <> '${USER_ID}'::uuid LIMIT 1;")"
if [[ -n "${OTHER_USER}" ]]; then
  echo "FAIL: ${ADMIN_MAILBOX} başka bir user_accounts kaydında kullanılıyor." >&2
  exit 1
fi

echo "=== Giriş e-postası → ${ADMIN_MAILBOX} ==="
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c \
  "UPDATE user_accounts SET \"emailAddress\"='${ADMIN_MAILBOX}', \"displayName\"=COALESCE(NULLIF(trim(\"displayName\"),''), '${display_escaped}') WHERE id='${USER_ID}'::uuid;"

if [[ -x "${INSTALL_DIR}/scripts/rotate-imap-credential-vps.sh" ]]; then
  echo "=== IMAP credential ==="
  bash "${INSTALL_DIR}/scripts/rotate-imap-credential-vps.sh" "${ADMIN_MAILBOX}"
fi

echo "=== .env operatör listeleri ==="
append_env_list "PLATFORM_OPERATOR_EMAILS" "${ADMIN_MAILBOX}"
append_env_list "PLATFORM_ADMIN_EMAILS" "${ADMIN_MAILBOX}"

if [[ -x "${INSTALL_DIR}/scripts/fix-postfix-inbound-pipe-transport.sh" ]]; then
  bash "${INSTALL_DIR}/scripts/fix-postfix-inbound-pipe-transport.sh" || true
fi

echo ""
echo "Tamam."
echo "  Posta girişi: ${ADMIN_MAILBOX} (şifre: önceki ${OLD_LOGIN_EMAIL} şifresi)"
echo "  Kutu / gönderen: ${ADMIN_MAILBOX}"
echo "  Sonraki: bash scripts/restart-api.sh"
echo "  IMAP şifre dosyası: /root/lerta-imap-credentials-bootstrap.txt"
