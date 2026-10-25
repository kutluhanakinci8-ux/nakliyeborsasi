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
ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
  # shellcheck source=scripts/resolve-operator-jwt.sh
  source "${ROOT}/scripts/resolve-operator-jwt.sh" || true
fi
export ENV_FILE

FAIL=0
SKIP_OPS=0
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
step_skip() {
  local title="$1"
  local reason="$2"
  echo ""
  echo "######## ${title} ########"
  echo "→ SKIP: ${reason}"
  SKIP_OPS=1
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
  step_skip "OAuth env verify" "VPS .env veya repo kök .env (docs/CUSTOMER_READY_GATE.md)"
fi

if [[ -n "${OPERATOR_JWT:-}" ]]; then
  step "Billing A1" bash "${ROOT}/scripts/run-mail-billing-a1-acceptance.sh"
else
  step_skip "Billing A1" "OPERATOR_JWT — platform operatör JWT"
fi

step "Integration smoke" bash "${ROOT}/scripts/qa-api-integration-smoke.sh"
step "Stress profile" bash "${ROOT}/scripts/qa-stress-profile.sh"

{
  echo "# Customer ready gate (${STAMP})"
  echo ""
  echo "| Otomasyon FAIL | ${FAIL} |"
  echo "| Ops SKIP | ${SKIP_OPS} |"
  echo ""
  echo "Komut: \`npm run customer-ready\`"
  echo ""
  echo "VPS son adımlar: \`docs/CUSTOMER_READY_GATE.md\`"
  echo ""
  echo "Tam ops zorunlu: \`STRICT_CUSTOMER_READY=1 npm run customer-ready\`"
} > "${REPORT}"

echo ""
echo "Rapor: ${REPORT}"
if [[ "${FAIL}" -eq 0 ]]; then
  if [[ "${SKIP_OPS}" -eq 1 && "${STRICT_CUSTOMER_READY:-0}" == "1" ]]; then
    echo "customer-readiness-gate: FAIL (STRICT — ops SKIP kaldı)" >&2
    exit 1
  fi
  echo "customer-readiness-gate: PASS"
  exit 0
fi
echo "customer-readiness-gate: FAIL" >&2
exit 1
