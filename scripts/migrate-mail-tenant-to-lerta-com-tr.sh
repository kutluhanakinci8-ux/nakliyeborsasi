#!/usr/bin/env bash
# VPS: kullanici.lerta.com.tr → lerta.com.tr (mail_domains + mailbox + user login e-postaları).
# Önce DNS: docs/DNS_LERTA_COM_TR_ISIMTESCIL.md · OpenDKIM: setup-mail-lerta-com-tr-pilot.sh
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"
FROM_DOMAIN="${FROM_DOMAIN:-kullanici.lerta.com.tr}"
TO_DOMAIN="${TO_DOMAIN:-lerta.com.tr}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL missing in .env" >&2
  exit 1
fi

echo "==> mail_domains ${FROM_DOMAIN} → ${TO_DOMAIN}"
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 <<SQL
UPDATE mail_domains
SET domain = '${TO_DOMAIN}'
WHERE domain = '${FROM_DOMAIN}' AND "domainType" = 'subdomain';

UPDATE mail_mailbox
SET "emailAddress" = replace("emailAddress", '@${FROM_DOMAIN}', '@${TO_DOMAIN}')
WHERE "emailAddress" LIKE '%@${FROM_DOMAIN}';

UPDATE user_accounts
SET "emailAddress" = replace("emailAddress", '@${FROM_DOMAIN}', '@${TO_DOMAIN}')
WHERE "emailAddress" LIKE '%@${FROM_DOMAIN}';
SQL

echo "==> .env tenant domain"
bash "${INSTALL_DIR}/scripts/enable-mail-pilot-lerta-com-tr-env.sh" "${INSTALL_DIR}"

echo "==> Postfix virtual + OpenDKIM (tenant=${TO_DOMAIN})"
export TENANT_DOMAIN="${TO_DOMAIN}"
bash "${INSTALL_DIR}/scripts/setup-mail-lerta-com-tr-pilot.sh"

echo "Migration tamam. API yeniden başlatın ve platform admin → inbound sync çalıştırın."
