#!/usr/bin/env bash
# Tüm QA gap fazları — tek final kapı (VPS önerilir).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DAY="$(TZ=Europe/Istanbul date +%Y-%m-%d)"
STAMP="$(TZ=Europe/Istanbul date -Iseconds)"
FINAL="${ROOT}/docs/reports/QA_GAP_CLOSURE_FINAL_${DAY}.json"
mkdir -p "${ROOT}/docs/reports"

ENV_FILE="${ENV_FILE:-}"
[[ -z "${ENV_FILE}" && -f /var/www/nakliyeborsasi/.env ]] && ENV_FILE=/var/www/nakliyeborsasi/.env
[[ -z "${ENV_FILE}" && -f "${ROOT}/.env" ]] && ENV_FILE="${ROOT}/.env"
export ENV_FILE

declare -A S
fail=0

step() {
  local key="$1"
  local title="$2"
  shift 2
  echo ""
  echo "======== ${title} ========"
  if "$@"; then
    S["${key}"]="PASS"
  else
    S["${key}"]="FAIL"
    fail=1
  fi
}

echo "== QA gap closure FINAL (${STAMP}) =="

step faz7 "Faz 7 pentest" npm run qa:faz7 --prefix "${ROOT}"
step faz8 "Faz 8 compliance" npm run qa:faz8 --prefix "${ROOT}"
step faz9 "Faz 9 UAT signoff" npm run qa:faz9 --prefix "${ROOT}"
step faz9b "Faz 9b assist" bash "${ROOT}/scripts/run-faz9b-pre-signoff-assist.sh"

if [[ "${QA_CLOSURE_STRICT:-0}" == "1" ]]; then
  step customer_ready "Customer-ready STRICT" env STRICT_CUSTOMER_READY=1 MAIL_INBOUND_PTR_SOFT=1 MAIL_BILLING_PILOT_FREE=1 \
    NPM_AUDIT_ALLOW_NEXT_CRITICAL=1 npm run customer-ready --prefix "${ROOT}"
else
  echo ""
  echo "SKIP: customer-ready (QA_CLOSURE_STRICT=1 ile zorunlu)"
  S["customer_ready"]="SKIP"
fi

# bash-friendly json
{
  echo "{"
  echo "  \"generatedAt\": \"${STAMP}\","
  echo "  \"timezone\": \"Europe/Istanbul\","
  echo "  \"failCount\": ${fail},"
  echo "  \"steps\": {"
  first=1
  for k in faz7 faz8 faz9 faz9b customer_ready; do
    [[ $first -eq 1 ]] || echo ","
    first=0
    printf '    "%s": "%s"' "$k" "${S[$k]:-UNKNOWN}"
  done
  echo ""
  echo "  },"
  echo "  \"external_pending\": [\"7b pentest firma\", \"8b SOC2/ISO\", \"9c müşteri imza (3 madde)\"],"
  echo "  \"closure_doc\": \"docs/QA_GAP_CLOSURE_COMPLETE.md\""
  echo "}"
} > "${FINAL}"

echo ""
echo "Wrote ${FINAL}"
if [[ "${fail}" -gt 0 ]]; then
  echo "run-qa-gap-closure-final: FAIL" >&2
  exit 1
fi
echo "run-qa-gap-closure-final: PASS"
exit 0
