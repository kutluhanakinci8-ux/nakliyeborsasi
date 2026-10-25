#!/usr/bin/env bash
# Web giriş şifresi sıfırla (posta + yonetim — aynı user_accounts).
set -euo pipefail

EMAIL="${1:-}"
NEW_PASSWORD="${2:-}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"
ENV_FILE="${ENV_FILE:-${INSTALL_DIR}/.env}"

if [[ -z "${EMAIL}" || -z "${NEW_PASSWORD}" ]]; then
  echo "Kullanım: $0 <email> <yeni-şifre>" >&2
  echo "Örnek: $0 info@lerta.com.tr 'YeniGucluSifre2026!'" >&2
  exit 1
fi

EMAIL="${EMAIL,,}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

# shellcheck disable=SC1091
source <(grep -E '^DATABASE_URL=' "${ENV_FILE}")

USER_ID="$(psql "${DATABASE_URL}" -At -c \
  "SELECT id FROM user_accounts WHERE lower(\"emailAddress\")='${EMAIL}' LIMIT 1;")"
if [[ -z "${USER_ID}" ]]; then
  echo "FAIL: kullanıcı yok: ${EMAIL}" >&2
  echo "Önce align-lerta-posta-admin-info-email.sh veya kayıt gerekir." >&2
  exit 2
fi

hash="$(NODE_PATH="${INSTALL_DIR}/node_modules" node -e \
  "process.stdout.write(require('bcrypt').hashSync(process.argv[1], 12))" "${NEW_PASSWORD}")"
hash_escaped="${hash//\'/\'\'}"

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c \
  "UPDATE user_accounts SET \"passwordHash\"='${hash_escaped}' WHERE id='${USER_ID}'::uuid;"

echo "OK: ${EMAIL} web giriş şifresi güncellendi."
echo "posta.lerta.com.tr ve yonetim.lerta.com.tr — aynı e-posta ve şifre."
