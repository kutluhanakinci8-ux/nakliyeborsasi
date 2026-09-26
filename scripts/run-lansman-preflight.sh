#!/usr/bin/env bash
# Faz A lansman öncesi read-only kontroller (DNS, HTTPS, billing env, vitrin).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE="${API_BASE:-https://yonetim.lerta.com.tr/api/v1}"
FAIL=0

echo "== Lerta Mail — Faz A lansman preflight =="

run_step() {
  local label="$1"
  shift
  echo ""
  echo "== ${label} =="
  if "$@"; then
    echo "OK: ${label}"
  else
    echo "NOT: ${label}" >&2
    FAIL=1
  fi
}

run_step "G0 posta HTTPS" bash "${ROOT}/scripts/verify-posta-https.sh"
run_step "Billing .env şeması" bash "${ROOT}/scripts/verify-mail-billing-config.sh"
run_step "www cutover DNS/HTTPS" bash "${ROOT}/scripts/preflight-www-cutover-lerta-mail.sh"

echo ""
echo "== Public status API =="
STATUS_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 12 \
  "${API_BASE}/public/lerta-mail/status" 2>/dev/null || echo "000")"
echo "GET public/lerta-mail/status → ${STATUS_CODE}"
if [[ "$STATUS_CODE" == "200" ]]; then
  echo "OK"
else
  echo "NOT: status API" >&2
  FAIL=1
fi

if [[ -n "${OPERATOR_JWT:-}" ]]; then
  run_step "A1 billing-health (JWT)" env OPERATOR_JWT="${OPERATOR_JWT}" \
    bash "${ROOT}/scripts/run-mail-billing-a1-acceptance.sh"
else
  echo ""
  echo "SKIP: OPERATOR_JWT yok — Stripe test checkout API doğrulaması atlandı"
  echo "      export OPERATOR_JWT=... && bash scripts/run-lansman-preflight.sh"
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "Lansman preflight: PASS (canlı ödeme anahtarları ve www cutover ayrı iş adımları)"
  exit 0
fi
echo "Lansman preflight: FAIL — docs/MAIL_BILLING_PRODUCTION_CUTOVER.md, WWW_CUTOVER_LERTA_MAIL.md" >&2
exit 1
