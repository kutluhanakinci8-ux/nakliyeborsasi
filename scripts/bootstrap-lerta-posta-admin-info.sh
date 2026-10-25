#!/usr/bin/env bash
# Lerta Posta platform yöneticisi: info@lerta.com.tr giriş + kutu + şifre (VPS, tek sefer).
# Şifreyi repoya yazmayın — ortam değişkeni ile verin.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"

OLD_LOGIN_EMAIL="${OLD_LOGIN_EMAIL:-a.kutluhan@msn.com}"
ADMIN_MAILBOX="${ADMIN_MAILBOX:-info@lerta.com.tr}"
ADMIN_DISPLAY_NAME="${ADMIN_DISPLAY_NAME:-Lerta Platform}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

if [[ -z "${ADMIN_PASSWORD}" ]]; then
  echo "ADMIN_PASSWORD gerekli (ör. export ADMIN_PASSWORD='...')" >&2
  exit 1
fi

export OLD_LOGIN_EMAIL ADMIN_MAILBOX ADMIN_DISPLAY_NAME
export REASSIGN_MAILBOX_TO_TARGET_ORG=1

bash "${INSTALL_DIR}/scripts/align-lerta-posta-admin-info-email.sh"
bash "${INSTALL_DIR}/scripts/reset-user-password-vps.sh" "${ADMIN_MAILBOX}" "${ADMIN_PASSWORD}"
bash "${INSTALL_DIR}/scripts/restart-api.sh"

echo ""
echo "Giriş: https://posta.lerta.com.tr/login"
echo "       https://yonetim.lerta.com.tr/login"
echo "E-posta: ${ADMIN_MAILBOX}"
echo "Şifre: (ADMIN_PASSWORD — güvenlik için tekrar yazılmıyor)"
