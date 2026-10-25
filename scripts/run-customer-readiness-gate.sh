#!/usr/bin/env bash
# Müşteri sunumu öncesi tam kapı: QA suite + OWASP + EN l10n + ops checklist rehberi.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(TZ=Europe/Istanbul date '+%Y-%m-%d')"
REPORT="${ROOT}/docs/reports/CUSTOMER_READY_GATE_${STAMP}.md"
mkdir -p "${ROOT}/docs/reports"

if [[ -f "${ROOT}/.env" ]] && [[ ! -f "${ENV_FILE:-}" ]]; then
  export ENV_FILE="${ROOT}/.env"
fi

FAIL=0
step() {
  local title="$1"
  shift
  echo ""
  echo "######## ${title} ########"
  if "$@"; then
    echo "→ PASS"
  else
    echo "→ FAIL" >&2
    FAIL=1
  fi
}

echo "== Customer readiness gate ${STAMP} (Europe/Istanbul) =="

step "Premium QA suite" \
  env MAIL_INBOUND_PTR_SOFT="${MAIL_INBOUND_PTR_SOFT:-1}" \
    MAIL_BILLING_PILOT_FREE="${MAIL_BILLING_PILOT_FREE:-1}" \
    NPM_AUDIT_ALLOW_NEXT_CRITICAL="${NPM_AUDIT_ALLOW_NEXT_CRITICAL:-1}" \
    bash "${ROOT}/scripts/run-lerta-premium-qa-suite.sh"

step "npm audit gate" bash "${ROOT}/scripts/qa-npm-audit-gate.sh"
step "OWASP baseline" bash "${ROOT}/scripts/qa-owasp-baseline.sh"
step "EN localization" bash "${ROOT}/scripts/qa-localization-en.sh"
step "k6/load profile" bash "${ROOT}/scripts/qa-k6-profile.sh"

if [[ -f "${ENV_FILE:-/var/www/nakliyeborsasi/.env}" ]]; then
  step "OAuth env verify" bash "${ROOT}/scripts/verify-uat-oauth-env.sh"
else
  echo ""
  echo "SKIP: OAuth env — VPS .env veya repo kök .env kopyala (docs/CUSTOMER_READY_GATE.md)"
fi

if [[ -n "${OPERATOR_JWT:-}" ]]; then
  step "Billing A1" bash "${ROOT}/scripts/run-mail-billing-a1-acceptance.sh"
else
  echo "SKIP: OPERATOR_JWT — platform operatör JWT (billing A1)"
fi

{
  echo "# Customer ready gate (${STAMP})"
  echo ""
  echo "| Sonuç | ${FAIL} |"
  echo ""
  echo "Komut: \`npm run customer-ready\`"
  echo ""
  echo "VPS son adımlar: \`docs/CUSTOMER_READY_GATE.md\`"
} > "${REPORT}"

echo ""
echo "Rapor: ${REPORT}"
if [[ "${FAIL}" -eq 0 ]]; then
  echo "customer-readiness-gate: PASS"
  exit 0
fi
echo "customer-readiness-gate: FAIL" >&2
exit 1
