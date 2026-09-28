#!/usr/bin/env bash
# Production deploy: Dovecot IMAP gold smoke (bootstrap şifre + gerekirse parity kutusu rotate).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="${INSTALL_DIR:-${ROOT}}"
EMAIL="${PARITY_IMAP_TEST_EMAIL:-${IMAP_GOLD_EMAIL:-nakliyeborsasi@lerta.com.tr}}"
ENV_FILE="${ENV_FILE:-${INSTALL_DIR}/.env}"

if [[ ! -f /etc/dovecot/conf.d/99-lerta-mail.conf ]]; then
  echo "SKIP: Dovecot Lerta yapılandırması yok"
  exit 0
fi

run_smoke() {
  INSTALL_DIR="${INSTALL_DIR}" ENV_FILE="${ENV_FILE}" IMAP_GOLD_EMAIL="${EMAIL}" \
    bash "${ROOT}/scripts/smoke-imap-gold.sh"
}

echo "=== IMAP gold smoke (deploy) — ${EMAIL} ==="
if run_smoke; then
  echo "OK: IMAP gold smoke (deploy)"
  exit 0
fi

echo "UYARI: smoke başarısız — parity test kutusu IMAP rotate deneniyor (${EMAIL})" >&2
if [[ -x "${ROOT}/scripts/rotate-imap-credential-vps.sh" ]]; then
  INSTALL_DIR="${INSTALL_DIR}" ENV_FILE="${ENV_FILE}" \
    bash "${ROOT}/scripts/rotate-imap-credential-vps.sh" "${EMAIL}"
  if run_smoke; then
    echo "OK: IMAP gold smoke (deploy, rotate sonrası)"
    exit 0
  fi
fi

echo "NOT: IMAP gold smoke (deploy) — docs/MAIL_IMAP_GOLD_SMOKE.md" >&2
exit 1
