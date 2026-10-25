#!/usr/bin/env bash
# Aktif parity IMAP test kutusu (deploy smoke / checklist).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${INSTALL_DIR:-${ROOT}}/.env}"

if [[ -n "${PARITY_IMAP_TEST_EMAIL:-}" ]]; then
  echo "${PARITY_IMAP_TEST_EMAIL}"
  exit 0
fi
if [[ -n "${IMAP_GOLD_EMAIL:-}" ]]; then
  echo "${IMAP_GOLD_EMAIL}"
  exit 0
fi

TENANT="lerta.com.tr"
DATABASE_URL=""
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1091
  source <(grep -E '^(DATABASE_URL|MAIL_PLATFORM_TENANT_DOMAIN)=' "${ENV_FILE}" || true)
  TENANT="${MAIL_PLATFORM_TENANT_DOMAIN:-lerta.com.tr}"
fi

if [[ -n "${DATABASE_URL:-}" ]] && command -v psql >/dev/null 2>&1; then
  email="$(psql "${DATABASE_URL}" -At -v ON_ERROR_STOP=1 -c \
    "SELECT \"emailAddress\" FROM mail_mailbox WHERE status='active' AND lower(\"emailAddress\") LIKE '%@${TENANT}' ORDER BY \"emailAddress\" LIMIT 1;" 2>/dev/null || true)"
  if [[ -n "${email}" ]]; then
    echo "${email}"
    exit 0
  fi
fi

echo "kutluhan@lerta.com.tr"
