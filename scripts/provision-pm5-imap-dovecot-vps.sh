#!/usr/bin/env bash
# PM-5 VPS: eksik mail_imap_credential oluştur, maildir iskeleti, Dovecot passwd senkronu.
# Güvenlik: mevcut şifreleri değiştirmez (FORCE_ROTATE=1 ile tümünü yeniler).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="${INSTALL_DIR:-${ROOT}}"
ENV_FILE="${ENV_FILE:-${INSTALL_DIR}/.env}"
TENANT_DOMAIN="${MAIL_PLATFORM_TENANT_DOMAIN:-lerta.com.tr}"
FORCE_ROTATE="${FORCE_ROTATE:-0}"
CRED_OUT="${CRED_OUT:-/root/lerta-imap-credentials-bootstrap.txt}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
source <(grep -E '^(DATABASE_URL|MAIL_IMAP[A-Z0-9_]*|MAIL_PLATFORM_TENANT_DOMAIN)=' "${ENV_FILE}" || true)
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL missing" >&2
  exit 1
fi

if [[ "${MAIL_IMAP_APPLY_DOVECOT:-}" != "true" ]]; then
  echo "MAIL_IMAP_APPLY_DOVECOT=true değil — atlanıyor."
  exit 0
fi

MAILDIR_ROOT="${MAIL_IMAP_MAILDIR_ROOT:-/var/mail/vhosts}"
PASSWD_FILE="${MAIL_IMAP_DOVECOT_PASSWD_PATH:-/etc/dovecot/lerta-imap-passwd}"
BCRYPT_MOD="${INSTALL_DIR}/node_modules/bcrypt"
if [[ ! -d "${BCRYPT_MOD}" ]]; then
  echo "bcrypt modülü yok (${BCRYPT_MOD}) — önce install-deps çalıştırın." >&2
  exit 1
fi

bcrypt_hash() {
  NODE_PATH="${INSTALL_DIR}/node_modules" node -e \
    "process.stdout.write(require('bcrypt').hashSync(process.argv[1], 10))" "$1"
}

random_pass() {
  openssl rand -base64 18 | tr -d '/+=' | head -c 22
}

ensure_maildir() {
  local email="$1"
  local local_part="${email%@*}"
  local domain="${email#*@}"
  local base="${MAILDIR_ROOT}/${domain}/${local_part}/Maildir"
  for sub in new cur tmp .Sent/cur .Sent/new .Archive/new .Trash/new .Junk/new; do
    mkdir -p "${base}/${sub}"
  done
  if id vmail &>/dev/null; then
    chown -R vmail:mail "${MAILDIR_ROOT}/${domain}/${local_part}" 2>/dev/null || true
  fi
}

echo "=== PM-5: IMAP credential bootstrap (@${TENANT_DOMAIN}) ==="
mapfile -t ROWS < <(
  psql "${DATABASE_URL}" -At -F $'\t' -v ON_ERROR_STOP=1 <<SQL
SELECT DISTINCT m."organizationId", m."emailAddress"
FROM mail_mailbox m
WHERE m.status = 'active'
  AND lower(m."emailAddress") LIKE '%@${TENANT_DOMAIN}'
ORDER BY m."emailAddress";
SQL
)

if [[ ${#ROWS[@]} -eq 0 ]]; then
  echo "Aktif mailbox bulunamadı."
  exit 0
fi

touch "${CRED_OUT}"
chmod 600 "${CRED_OUT}"
new_lines=0

for row in "${ROWS[@]}"; do
  org_id="${row%%$'\t'*}"
  email="${row#*$'\t'}"
  email="${email,,}"
  [[ -z "${org_id}" || -z "${email}" ]] && continue

  ensure_maildir "${email}"

  has_cred="$(psql "${DATABASE_URL}" -At -c \
    "SELECT 1 FROM mail_imap_credential WHERE \"organizationId\"='${org_id}'::uuid LIMIT 1;" || true)"
  if [[ -n "${has_cred}" && "${FORCE_ROTATE}" != "1" ]]; then
    echo "skip credential (exists): ${email}"
    continue
  fi

  pass="$(random_pass)"
  hash="$(bcrypt_hash "${pass}")"
  hash_escaped="${hash//\'/\'\'}"
  email_escaped="${email//\'/\'\'}"

  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO mail_imap_credential (id, "organizationId", "emailAddress", "passwordHash", "createdAt", "updatedAt")
VALUES (uuid_generate_v4(), '${org_id}'::uuid, '${email_escaped}', '${hash_escaped}', now(), now())
ON CONFLICT ("organizationId") DO UPDATE SET
  "emailAddress" = EXCLUDED."emailAddress",
  "passwordHash" = EXCLUDED."passwordHash",
  "updatedAt" = now();
SQL

  {
    echo "$(date -Is) ${email} ${pass}"
  } >> "${CRED_OUT}"
  echo "OK new/rotated IMAP: ${email} (şifre → ${CRED_OUT})"
  new_lines=$((new_lines + 1))
done

echo "=== Dovecot passwd sync ==="
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

mkdir -p "$(dirname "${PASSWD_FILE}")"
printf '%s\n' "${lines[@]}" > "${PASSWD_FILE}"
chown root:dovecot "${PASSWD_FILE}"
chmod 640 "${PASSWD_FILE}"

if systemctl is-active --quiet dovecot 2>/dev/null; then
  systemctl reload dovecot || systemctl restart dovecot
fi

echo "passwd: ${PASSWD_FILE} (${#CREDS[@]} kullanıcı)"
echo "yeni/rotate: ${new_lines} · bootstrap: ${CRED_OUT}"
echo "=== PM-5 provision bitti ==="
