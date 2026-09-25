#!/usr/bin/env bash
set -euo pipefail

# Stripe / iyzico ortam değişkenlerini ve (isteğe bağlı) canlı API status endpoint'ini doğrular.
# Kullanım:
#   ./scripts/verify-mail-billing-config.sh
#   MAIL_BILLING_JWT='eyJ...' API_BASE='https://yonetim.lerta.com.tr/api/v1' ./scripts/verify-mail-billing-config.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"

echo "== Lerta Mail billing config =="

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
  echo "Loaded: $ENV_FILE"
else
  echo "No .env at $ENV_FILE (checking process env only)"
fi

provider="${MAIL_BILLING_PROVIDER:-stripe}"
echo "MAIL_BILLING_PROVIDER=$provider"

if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
  if [[ "$STRIPE_SECRET_KEY" == sk_test_* ]]; then
    echo "STRIPE_SECRET_KEY: set (test mode)"
  elif [[ "$STRIPE_SECRET_KEY" == sk_live_* ]]; then
    echo "STRIPE_SECRET_KEY: set (LIVE — dikkat)"
  else
    echo "STRIPE_SECRET_KEY: set (unknown prefix)"
  fi
else
  echo "STRIPE_SECRET_KEY: missing"
fi

[[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]] && echo "STRIPE_WEBHOOK_SECRET: set" || echo "STRIPE_WEBHOOK_SECRET: missing"
[[ -n "${STRIPE_MAIL_CORPORATE_PRICE_ID:-}" ]] && echo "STRIPE_MAIL_CORPORATE_PRICE_ID: set" || echo "STRIPE_MAIL_CORPORATE_PRICE_ID: missing"

[[ -n "${IYZICO_API_KEY:-}" ]] && echo "IYZICO_API_KEY: set" || echo "IYZICO_API_KEY: missing"
[[ -n "${IYZICO_SECRET_KEY:-}" ]] && echo "IYZICO_SECRET_KEY: set" || echo "IYZICO_SECRET_KEY: missing"
echo "IYZICO_BASE_URL=${IYZICO_BASE_URL:-https://sandbox-api.iyzipay.com}"
echo "IYZICO_CALLBACK_URL=${IYZICO_CALLBACK_URL:-<default /webhooks/mail-billing/iyzico>}"
echo "MAIL_API_PUBLIC_URL=${MAIL_API_PUBLIC_URL:-https://yonetim.lerta.com.tr/api/v1}"

if [[ -n "${MAIL_BILLING_JWT:-}" ]]; then
  API_BASE="${API_BASE:-https://yonetim.lerta.com.tr/api/v1}"
  echo ""
  echo "== GET $API_BASE/company/mail-billing/status =="
  curl -fsS \
    -H "Authorization: Bearer $MAIL_BILLING_JWT" \
    "$API_BASE/company/mail-billing/status" | python3 -m json.tool
else
  echo ""
  echo "Tip: MAIL_BILLING_JWT ile konsol oturum token'ı vererek canlı status JSON alın."
fi
