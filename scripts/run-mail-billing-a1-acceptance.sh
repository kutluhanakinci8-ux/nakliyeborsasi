#!/usr/bin/env bash
# Faz A1 — Stripe test checkout hazırlık doğrulaması (VPS veya CI).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE="${API_BASE:-https://yonetim.lerta.com.tr/api/v1}"
JWT="${MAIL_BILLING_JWT:-${OPERATOR_JWT:-}}"

echo "== A1 Lerta Mail billing acceptance =="

bash "${ROOT}/scripts/verify-mail-billing-config.sh"

if [[ -z "$JWT" ]]; then
  echo ""
  echo "SKIP: Canlı API A1 checklist için OPERATOR_JWT veya MAIL_BILLING_JWT gerekli."
  echo "Operatör oturum token + platform-admin/mail/billing-health"
  exit 0
fi

echo ""
echo "== GET platform-admin/mail/billing-health =="
HEALTH_JSON="$(curl -fsS -H "Authorization: Bearer $JWT" \
  "${API_BASE}/platform-admin/mail/billing-health")"
echo "$HEALTH_JSON" | python3 -m json.tool

READY="$(echo "$HEALTH_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['a1']['ready'])")"
if [[ "$READY" != "True" ]]; then
  echo ""
  echo "A1: NOT READY — operatör panelinde checklist ve .env düzeltin." >&2
  echo "Kurulum: docs/MAIL_BILLING_STRIPE_SETUP.md" >&2
  exit 2
fi

echo ""
echo "A1: API checklist READY"

if [[ "${RUN_CHECKOUT_SMOKE:-}" == "1" ]]; then
  echo ""
  echo "== Checkout URL smoke =="
  MAIL_BILLING_JWT="$JWT" API_BASE="$API_BASE" bash "${ROOT}/scripts/smoke-mail-billing-stripe.sh"
fi

echo ""
echo "Manuel: konsol → Öde ve Kurumsal'a geç → kart 4242… → dashboard?billing=success"
echo "A1 tamamlandı sayılır: plan Kurumsal + webhook invoice olayları."
