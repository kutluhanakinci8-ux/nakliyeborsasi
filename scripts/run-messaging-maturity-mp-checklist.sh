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

if curl -fsS -o /dev/null --connect-timeout 2 "${API_BASE:-http://127.0.0.1:3001/api/v1}/messaging/status" 2>/dev/null; then
  run_step "MP-2 FS-12 WA sandbox" bash "${ROOT}/scripts/verify-messaging-wa-bridge-sandbox.sh"
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
