#!/usr/bin/env bash
set -euo pipefail

# Canlı Stripe / iyzico faturalama hazırlığını doğrular.
# Kullanım:
#   ./scripts/verify-mail-billing-prod.sh
#   OPERATOR_JWT='eyJ...' API_BASE='https://yonetim.lerta.com.tr/api/v1' ./scripts/verify-mail-billing-prod.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"

echo "== Lerta Mail billing PRODUCTION readiness =="

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
  echo "Loaded: $ENV_FILE"
fi

provider="${MAIL_BILLING_PROVIDER:-stripe}"
echo "MAIL_BILLING_PROVIDER=$provider"

fail=0

if [[ "$provider" == "stripe" ]]; then
  if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
    echo "FAIL: STRIPE_SECRET_KEY missing"
    fail=1
  elif [[ "$STRIPE_SECRET_KEY" != sk_live_* ]]; then
    echo "FAIL: STRIPE_SECRET_KEY must be sk_live_ for production"
    fail=1
  else
    echo "OK: Stripe live secret present"
  fi
  [[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]] && echo "OK: STRIPE_WEBHOOK_SECRET" || { echo "FAIL: STRIPE_WEBHOOK_SECRET"; fail=1; }
  [[ -n "${STRIPE_MAIL_CORPORATE_PRICE_ID:-}" ]] && echo "OK: corporate price" || { echo "FAIL: STRIPE_MAIL_CORPORATE_PRICE_ID"; fail=1; }
fi

if [[ "$provider" == "iyzico" ]]; then
  base="${IYZICO_BASE_URL:-https://sandbox-api.iyzipay.com}"
  if [[ "$base" == *sandbox* ]]; then
    echo "FAIL: IYZICO_BASE_URL still sandbox ($base)"
    fail=1
  else
    echo "OK: iyzico base $base"
  fi
  [[ -n "${IYZICO_API_KEY:-}" && -n "${IYZICO_SECRET_KEY:-}" ]] && echo "OK: iyzico keys" || { echo "FAIL: IYZICO_API_KEY/SECRET"; fail=1; }
fi

if [[ -n "${OPERATOR_JWT:-}" ]]; then
  API_BASE="${API_BASE:-https://yonetim.lerta.com.tr/api/v1}"
  echo ""
  echo "== GET $API_BASE/platform-admin/mail/billing-health =="
  json="$(curl -fsS \
    -H "Authorization: Bearer $OPERATOR_JWT" \
    "$API_BASE/platform-admin/mail/billing-health")"
  echo "$json" | python3 -m json.tool
  ready="$(echo "$json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('production',{}).get('ready',False))")"
  if [[ "$ready" != "True" && "$ready" != "true" ]]; then
    echo "FAIL: API production.ready is false"
    fail=1
  else
    echo "OK: API production.ready"
  fi
else
  echo ""
  echo "Tip: OPERATOR_JWT ile platform-admin billing-health JSON doğrulaması eklenir."
fi

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi

echo ""
echo "Production billing checks passed."
