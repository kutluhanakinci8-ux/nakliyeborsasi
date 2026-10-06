#!/usr/bin/env bash
# EK-SHIP: #341 main merge sonrası operatör adımları (deploy prod smoke bekler).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Ekolojik market ship checklist (EK-SHIP) =="

git fetch origin main -q 2>/dev/null || true
git show "origin/main:apps/api/src/modules/ekolojik-market/EkolojikMarketStatusController.ts" \
  >/dev/null 2>&1 || {
  echo "FAIL: origin/main missing ekolojik status module" >&2
  exit 1
}
echo "OK: rollup on origin/main"

bash "${ROOT}/scripts/verify-ekolojik-market-program-done.sh"

echo ""
echo "== Operatör (manuel) =="
echo "1. Açık duplicate PR'lar (#337–#340) varsa GitHub'da kapat (merged via #341)."
echo "2. VPS: DEPLOY_BRANCH=main bash scripts/deploy-production-vps.sh"
echo "3. Prod: bash scripts/run-ekolojik-market-post-deploy-gate.sh"
echo "4. İsteğe bağlı: EK_CLOSE_STALE_PRS=1 (faz PR'ları zaten kapalı olabilir)"
echo ""
echo "run-ekolojik-market-ship-checklist: PASS"
