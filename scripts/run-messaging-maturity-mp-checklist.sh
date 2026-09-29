#!/usr/bin/env bash
# MP-1…MP-3 maturity smoke (repo + local API when up).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0

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

echo "== Messaging / Posta maturity (MP) checklist =="

run_step "MP-1 TypeORM entities" bash "${ROOT}/scripts/verify-typeorm-global-entities.sh"
run_step "MP-3 core unit tests" npm run test:unit --prefix "${ROOT}"

run_step "MP-5 communications ops" bash "${ROOT}/scripts/verify-communications-ops-snapshot.sh"
run_step "MP-6 deliverability" bash "${ROOT}/scripts/verify-mail-deliverability-mp6.sh"
run_step "MP-7 a11y (axe)" bash "${ROOT}/scripts/verify-messaging-a11y-mp7.sh"
run_step "MP-8 hub PWA" bash "${ROOT}/scripts/verify-messaging-hub-pwa-mp8.sh"
run_step "MP-9 security compliance" bash "${ROOT}/scripts/verify-security-compliance-mp9.sh"
run_step "MP-10 parity sign-off" env MP10_FULL=0 bash "${ROOT}/scripts/verify-messaging-parity-close-mp10.sh"

if [[ "${SKIP_PLAYWRIGHT:-}" != "1" ]]; then
  run_step "MP-3 Playwright smoke (public)" bash "${ROOT}/scripts/verify-messaging-playwright-e2e.sh"
else
  echo ""
  echo "SKIP: SKIP_PLAYWRIGHT=1"
fi

if curl -fsS -o /dev/null --connect-timeout 2 "${API_BASE:-http://127.0.0.1:3001/api/v1}/messaging/status" 2>/dev/null; then
  run_step "MP-2 FS-12 WA sandbox" bash "${ROOT}/scripts/verify-messaging-wa-bridge-sandbox.sh"
  if [[ "${MP2_WA_STRICT:-}" == "1" ]]; then
    run_step "MP-2 WA prod delivery" bash "${ROOT}/scripts/verify-messaging-wa-bridge-prod-mp2.sh"
  else
    echo ""
    echo "SKIP: MP2_WA_STRICT≠1 — verify-messaging-wa-bridge-prod-mp2"
  fi
else
  echo ""
  echo "SKIP: API yok — verify-messaging-wa-bridge-sandbox"
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "MP maturity checklist: PASS"
  exit 0
fi
echo "MP maturity checklist: FAIL" >&2
exit 1
