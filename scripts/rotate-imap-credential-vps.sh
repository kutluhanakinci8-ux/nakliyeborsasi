#!/usr/bin/env bash
# Tek mailbox IMAP şifresi yenile + Dovecot passwd senkronu (gold smoke / kurtarma).
set -euo pipefail

EMAIL="${1:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="${INSTALL_DIR:-${ROOT}}"
ENV_FILE="${ENV_FILE:-${INSTALL_DIR}/.env}"
CRED_OUT="${CRED_OUT:-/root/lerta-imap-credentials-bootstrap.txt}"

if [[ -z "${EMAIL}" ]]; then
  echo "Kullanım: $0 <mailbox@domain>" >&2
  exit 1
fi
EMAIL="${EMAIL,,}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

# shellcheck disable=SC1091
source <(grep -E '^(DATABASE_URL|MAIL_IMAP_DOVECOT_PASSWD_PATH)=' "${ENV_FILE}" || true)
PASSWD_FILE="${MAIL_IMAP_DOVECOT_PASSWD_PATH:-/etc/dovecot/lerta-imap-passwd}"
BCRYPT_MOD="${INSTALL_DIR}/node_modules/bcrypt"
[[ -d "${BCRYPT_MOD}" ]] || { echo "bcrypt missing" >&2; exit 1; }

org_id="$(psql "${DATABASE_URL}" -At -c \
  "SELECT \"organizationId\" FROM mail_mailbox WHERE lower(\"emailAddress\")='${EMAIL}' AND status='active' LIMIT 1;")"
[[ -n "${org_id}" ]] || { echo "Aktif mailbox yok: ${EMAIL}" >&2; exit 2; }

pass="$(openssl rand -base64 18 | tr -d '/+=' | head -c 22)"
hash="$(NODE_PATH="${INSTALL_DIR}/node_modules" node -e \
  "process.stdout.write(require('bcrypt').hashSync(process.argv[1], 10))" "${pass}")"
hash_escaped="${hash//\'/\'\'}"
email_escaped="${EMAIL//\'/\'\'}"

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO mail_imap_credential (id, "organizationId", "emailAddress", "passwordHash", "createdAt", "updatedAt")
VALUES (uuid_generate_v4(), '${org_id}'::uuid, '${email_escaped}', '${hash_escaped}', now(), now())
ON CONFLICT ("organizationId") DO UPDATE SET
  "emailAddress" = EXCLUDED."emailAddress",
  "passwordHash" = EXCLUDED."passwordHash",
  "updatedAt" = now();
SQL

mapfile -t CREDS < <(
  psql "${DATABASE_URL}" -At -F $'\t' -c \
    'SELECT "emailAddress", "passwordHash" FROM mail_imap_credential ORDER BY "emailAddress";'
)
lines=()
for cred in "${CREDS[@]}"; do
  em="${cred%%$'\t'*}"
  h="${cred#*$'\t'}"
  lines+=("${em}:{BLF-CRYPT}${h}")
done
printf '%s\n' "${lines[@]}" > "${PASSWD_FILE}"
chown root:dovecot "${PASSWD_FILE}"
chmod 640 "${PASSWD_FILE}"
systemctl reload dovecot 2>/dev/null || systemctl restart dovecot

{
  echo "$(date -Is) ${EMAIL} ${pass}"
} >> "${CRED_OUT}"
chmod 600 "${CRED_OUT}"

echo "OK: IMAP rotated ${EMAIL} (şifre → ${CRED_OUT} son satır)"
if [[ "${PRINT_IMAP_GOLD_PASSWORD:-}" == "1" ]]; then
  echo "${pass}"
fi
