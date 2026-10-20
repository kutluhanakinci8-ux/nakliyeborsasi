#!/usr/bin/env bash
# P0 — Stripe/iyzico test → canlı checkout hazırlığı (değişiklik yapmaz).
#
#   bash scripts/run-mail-billing-p0-cutover.sh
#   ENV_FILE=/var/www/nakliyeborsasi/.env bash scripts/run-mail-billing-p0-cutover.sh
#   OPERATOR_JWT=... API_BASE=... bash scripts/run-mail-billing-p0-cutover.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== 1/2 Sandbox / config =="
bash "${ROOT}/scripts/verify-mail-billing-config.sh"

echo ""
echo "== 2/2 Production readiness =="
if bash "${ROOT}/scripts/verify-mail-billing-prod.sh"; then
  echo ""
  echo "P0 billing: PASS (canlı ödeme için hazır)"
  exit 0
fi

echo ""
echo "P0 billing: FAIL — docs/MAIL_BILLING_PRODUCTION_CUTOVER.md" >&2
echo "Test modunda devam: sk_test_* + sandbox iyzico ile verify-mail-billing-config PASS yeterli." >&2
exit 1
