#!/usr/bin/env bash
# VPS .env: MAIL_WEB_PUSH_VAPID_* (yoksa üretir) + API restart.
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "HATA: ${ENV_FILE} bulunamadı." >&2
  exit 1
fi

set_kv() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "${ENV_FILE}"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
  else
    echo "${key}=${value}" >> "${ENV_FILE}"
  fi
}

if ! grep -q "^MAIL_WEB_PUSH_VAPID_PUBLIC_KEY=.\+" "${ENV_FILE}" 2>/dev/null; then
  echo "==> VAPID anahtarları üretiliyor…"
  read -r pub priv <<EOF
$(node -e "const w=require('web-push');const k=w.generateVAPIDKeys();console.log(k.publicKey+' '+k.privateKey);")
EOF
  set_kv "MAIL_WEB_PUSH_VAPID_PUBLIC_KEY" "${pub}"
  set_kv "MAIL_WEB_PUSH_VAPID_PRIVATE_KEY" "${priv}"
  set_kv "MAIL_WEB_PUSH_VAPID_SUBJECT" "mailto:admin@lerta.tr"
  set_kv "MAIL_WEB_PUBLIC_URL" "https://posta.lerta.com.tr"
  echo "OK: VAPID eklendi"
else
  echo "SKIP: VAPID zaten var"
fi

bash "${INSTALL_DIR}/scripts/restart-api.sh" "${INSTALL_DIR}"
echo "Push env tamam."
