#!/usr/bin/env bash
# VPS .env: MESSAGING_WEB_PUSH_VAPID_* (sohbet — mail'den ayrı) + API restart.
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

if ! grep -q "^MESSAGING_WEB_PUSH_VAPID_PUBLIC_KEY=.\+" "${ENV_FILE}" 2>/dev/null; then
  echo "==> Messaging VAPID anahtarları üretiliyor…"
  read -r pub priv <<EOF
$(cd "${INSTALL_DIR}" && node -e "const w=require('web-push');const k=w.generateVAPIDKeys();console.log(k.publicKey+' '+k.privateKey);")
EOF
  set_kv "MESSAGING_WEB_PUSH_VAPID_PUBLIC_KEY" "${pub}"
  set_kv "MESSAGING_WEB_PUSH_VAPID_PRIVATE_KEY" "${priv}"
  set_kv "MESSAGING_WEB_PUSH_VAPID_SUBJECT" "mailto:notifications@mail.lerta.com.tr"
  set_kv "MESSAGING_WEB_PUBLIC_URL" "https://app.lerta.com.tr"
  set_kv "MESSAGING_WEB_PUSH_ALLOW_MAIL_FALLBACK" "false"
  echo "OK: Messaging VAPID eklendi (mail anahtarlarından bağımsız)"
else
  echo "SKIP: MESSAGING_WEB_PUSH_VAPID_PUBLIC_KEY zaten var"
fi

bash "${INSTALL_DIR}/scripts/restart-api.sh" "${INSTALL_DIR}"
echo "Messaging push env tamam."
