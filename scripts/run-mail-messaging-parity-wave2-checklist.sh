#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
FAIL=0
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
export API_BASE

run_step() {
  local title="$1"
  shift
  echo ""
  echo "== ${title} =="
  if "$@"; then
    echo "OK"
  else
    echo "NOT: ${title}" >&2
    FAIL=1
  fi
}

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

echo "== Mail & Messaging parity wave-2 =="

run_step "Parity close (PM-1…10)" bash "${ROOT}/scripts/run-mail-messaging-parity-close-checklist.sh"

if [[ -n "${OPERATOR_JWT:-}" ]]; then
  run_step "A1 billing-health" bash "${ROOT}/scripts/run-mail-billing-a1-acceptance.sh"
  run_step "Prod billing" bash "${ROOT}/scripts/verify-mail-billing-prod.sh"
else
  echo ""
  echo "SKIP: OPERATOR_JWT yok — billing-health otomatik smoke (madde 17)"
fi

run_step "DNS legacy" env DNS_LEGACY_SOFT=1 bash "${ROOT}/scripts/verify-dns-legacy-cleanup.sh" "${DNS_LEGACY_DOMAIN:-lerta.com.tr}"

if [[ -f "${ENV_FILE}" ]]; then
  run_step "Messaging push VAPID izolasyon" bash "${ROOT}/scripts/verify-messaging-web-push-prod.sh" "${ENV_FILE}" || true
  run_step "Multi-VPS mail rolü" bash "${ROOT}/scripts/verify-multi-vps-mail-role.sh" || true
  if [[ "${SKIP_DR_DRILL:-}" != "1" ]]; then
    run_step "DR tatbikat kanıtı" bash "${ROOT}/scripts/bootstrap-dr-drill-evidence.sh" || true
  fi
fi

run_step "SSE smoke" bash "${ROOT}/scripts/smoke-messaging-sse-load.sh" || true

if [[ "${SKIP_LIGHTHOUSE:-}" != "1" ]]; then
  run_step "Lighthouse PWA" bash "${ROOT}/scripts/verify-lighthouse-mail-pwa.sh" || true
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "Wave-2 checklist: PASS"
  exit 0
fi
echo "Wave-2 checklist: FAIL" >&2
exit 1
