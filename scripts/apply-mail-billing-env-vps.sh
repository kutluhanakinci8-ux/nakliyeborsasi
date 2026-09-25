#!/usr/bin/env bash
# VPS .env içine Lerta Mail ödeme değişkenlerini ekler (mevcut satırları ezmez).
# Yerelden SSH ile:
#   STRIPE_SECRET_KEY=sk_test_... STRIPE_MAIL_CORPORATE_PRICE_ID=price_... \
#   STRIPE_WEBHOOK_SECRET=whsec_... bash scripts/apply-mail-billing-env-vps.sh
set -euo pipefail

VPS_HOST="${VPS_HOST:-168.231.109.27}"
VPS_USER="${VPS_USER:-root}"
INSTALL_DIR="${VPS_INSTALL_DIR:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"

upsert_remote() {
  local key="$1"
  local value="$2"
  [[ -n "$value" ]] || return 0
  SSHPASS="$VPS_SSH_PASSWORD" sshpass -e ssh -o StrictHostKeyChecking=accept-new \
    -o PreferredAuthentications=password -o PubkeyAuthentication=no \
    "${VPS_USER}@${VPS_HOST}" "bash -s" <<REMOTE
set -euo pipefail
ENV_FILE='${ENV_FILE}'
KEY='${key}'
VALUE='${value}'
touch "\$ENV_FILE"
if grep -q "^\\\${KEY}=" "\$ENV_FILE" 2>/dev/null; then
  sed -i "s|^\\\${KEY}=.*|\\\${KEY}=\\\${VALUE}|" "\$ENV_FILE"
else
  printf '%s=%s\\n' "\$KEY" "\$VALUE" >> "\$ENV_FILE"
fi
REMOTE
}

if [[ -z "${VPS_SSH_PASSWORD:-}" ]]; then
  echo "VPS_SSH_PASSWORD gerekli." >&2
  exit 1
fi

echo "==> ${VPS_USER}@${VPS_HOST} ${ENV_FILE}"

upsert_remote "MAIL_BILLING_PROVIDER" "${MAIL_BILLING_PROVIDER:-stripe}"
upsert_remote "MAIL_CONSOLE_PUBLIC_URL" "${MAIL_CONSOLE_PUBLIC_URL:-https://yonetim.lerta.com.tr}"
upsert_remote "MAIL_API_PUBLIC_URL" "${MAIL_API_PUBLIC_URL:-https://yonetim.lerta.com.tr/api/v1}"
upsert_remote "STRIPE_SECRET_KEY" "${STRIPE_SECRET_KEY:-}"
upsert_remote "STRIPE_WEBHOOK_SECRET" "${STRIPE_WEBHOOK_SECRET:-}"
upsert_remote "STRIPE_MAIL_CORPORATE_PRICE_ID" "${STRIPE_MAIL_CORPORATE_PRICE_ID:-}"
upsert_remote "STRIPE_MAIL_ENTERPRISE_PRICE_ID" "${STRIPE_MAIL_ENTERPRISE_PRICE_ID:-}"
upsert_remote "IYZICO_API_KEY" "${IYZICO_API_KEY:-}"
upsert_remote "IYZICO_SECRET_KEY" "${IYZICO_SECRET_KEY:-}"
upsert_remote "IYZICO_BASE_URL" "${IYZICO_BASE_URL:-https://sandbox-api.iyzipay.com}"
upsert_remote "IYZICO_CORPORATE_PRICE_TRY" "${IYZICO_CORPORATE_PRICE_TRY:-490.00}"
upsert_remote "IYZICO_CALLBACK_URL" "${IYZICO_CALLBACK_URL:-https://yonetim.lerta.com.tr/api/v1/webhooks/mail-billing/iyzico}"

SSHPASS="$VPS_SSH_PASSWORD" sshpass -e ssh -o StrictHostKeyChecking=accept-new \
  -o PreferredAuthentications=password -o PubkeyAuthentication=no \
  "${VPS_USER}@${VPS_HOST}" "cd '${INSTALL_DIR}' && bash scripts/restart-api.sh '${INSTALL_DIR}'"

echo "Tamam. Operatör → Ödeme altyapısı veya verify-mail-billing-config.sh ile doğrulayın."
