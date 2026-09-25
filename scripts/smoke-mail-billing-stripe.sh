#!/usr/bin/env bash
# Faz A1 — Stripe checkout smoke (JWT gerekli).
set -euo pipefail

API_BASE="${API_BASE:-https://yonetim.lerta.com.tr/api/v1}"
JWT="${MAIL_BILLING_JWT:-}"

if [[ -z "$JWT" ]]; then
  echo "MAIL_BILLING_JWT gerekli (yonetim oturum token)." >&2
  exit 1
fi

echo "== GET mail-billing/status =="
STATUS_JSON="$(curl -fsS -H "Authorization: Bearer $JWT" "$API_BASE/company/mail-billing/status")"
echo "$STATUS_JSON" | python3 -m json.tool

CAN_START="$(echo "$STATUS_JSON" | python3 -c "import sys,json; c=json.load(sys.stdin)['status']['checkout']; print(c.get('canStartCorporate', c.get('canStart', False)))")"
if [[ "$CAN_START" != "True" ]]; then
  echo "Checkout başlatılamaz — blockers yukarıda. VPS: apply-mail-billing-env-vps.sh" >&2
  exit 2
fi

echo ""
echo "== POST checkout/corporate (URL only) =="
CHECKOUT_JSON="$(curl -fsS -X POST -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$API_BASE/company/mail-billing/checkout/corporate")"
echo "$CHECKOUT_JSON" | python3 -m json.tool
URL="$(echo "$CHECKOUT_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('url') or '')")"
if [[ -z "$URL" ]]; then
  echo "Stripe checkout URL üretilmedi." >&2
  exit 3
fi
echo ""
echo "Tarayıcıda açın ve test kartı 4242 4242 4242 4242 kullanın:"
echo "$URL"
