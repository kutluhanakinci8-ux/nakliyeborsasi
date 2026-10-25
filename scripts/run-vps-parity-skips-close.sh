#!/usr/bin/env bash
# VPS: parity checklist SKIP maddelerini JWT + .env ile kapatır.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
if [[ ! -f "${ENV_FILE}" && -f "${ROOT}/.env" ]]; then
  ENV_FILE="${ROOT}/.env"
fi

export ENV_FILE
export MAIL_INBOUND_PTR_SOFT="${MAIL_INBOUND_PTR_SOFT:-1}"
export MAIL_BILLING_PILOT_FREE="${MAIL_BILLING_PILOT_FREE:-1}"
export API_BASE="${API_BASE:-https://yonetim.lerta.com.tr/api/v1}"
export INSTALL_DIR="${INSTALL_DIR:-${ROOT}}"

cd "${ROOT}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

# shellcheck source=scripts/resolve-operator-jwt.sh
source "${ROOT}/scripts/resolve-operator-jwt.sh" || true
# shellcheck source=scripts/resolve-messaging-test-jwt.sh
source "${ROOT}/scripts/resolve-messaging-test-jwt.sh" || true
# shellcheck source=scripts/resolve-mail-jmap-jwt.sh
source "${ROOT}/scripts/resolve-mail-jmap-jwt.sh" || true

export MESSAGING_SSE_JWT="${MESSAGING_SSE_JWT:-${MESSAGING_TEST_JWT:-}}"
export MAIL_JMAP_JWT="${MAIL_JMAP_JWT:-${ACCESS_TOKEN:-}}"

echo "== VPS parity SKIP close =="
echo "ENV_FILE=${ENV_FILE}"
echo "OPERATOR_JWT=${OPERATOR_JWT:+set}"
echo "MESSAGING_SSE_JWT=${MESSAGING_SSE_JWT:+set}"
echo "MAIL_JMAP_JWT=${MAIL_JMAP_JWT:+set}"

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

step "Parity close (full)" \
  bash "${ROOT}/scripts/run-mail-messaging-parity-close-checklist.sh"

step "Wave-2 (full)" \
  bash "${ROOT}/scripts/run-mail-messaging-parity-wave2-checklist.sh"

step "UAT ops runtime" \
  env UAT_VPS_RUNTIME=1 bash "${ROOT}/scripts/verify-uat-ops-runtime.sh"

if [[ "${FAIL}" -eq 0 ]]; then
  echo ""
  echo "vps-parity-skips-close: PASS"
  exit 0
fi
echo "vps-parity-skips-close: FAIL" >&2
exit 1
