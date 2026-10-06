#!/usr/bin/env bash
# EK-ROLL: main'e tek merge öncesi dosya + modül manifesti (canlı API gerekmez).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_MODULE="${ROOT}/apps/api/src/AppModule.ts"

echo "== Ekolojik market roll manifest (EK-ROLL) =="

test -f "${APP_MODULE}" || {
  echo "FAIL: AppModule missing" >&2
  exit 1
}
grep -q "EkolojikMarketModule" "${APP_MODULE}" || {
  echo "FAIL: AppModule must import EkolojikMarketModule" >&2
  exit 1
}
echo "OK: API EkolojikMarketModule registered"

for path in \
  apps/web/src/app/marketim/posta-ve-mesaj/page.tsx \
  apps/web/src/app/marketim/layout.tsx \
  apps/web/src/components/ekolojik/EkolojikCommunicationsHubClient.tsx \
  apps/web/src/lib/productShellProfile.ts \
  apps/api/src/modules/ekolojik-market/EkolojikMarketStatusController.ts \
  .github/workflows/ekolojik-market-parity.yml \
  docs/EKOLojIK_MARKET_PARITY_ROADMAP.md \
  scripts/run-ekolojik-market-post-deploy-gate.sh; do
  test -f "${ROOT}/${path}" || {
    echo "FAIL: missing ${path}" >&2
    exit 1
  }
  echo "OK: ${path}"
done

for lib in \
  ekolojikMailSectionHandoff.ts \
  ekolojikSocialHubDeepLink.ts \
  ekolojikMailOpsRunbookDeepLink.ts \
  mailWebEmbedDeepLink.ts; do
  test -f "${ROOT}/apps/web/src/lib/${lib}" || {
    echo "FAIL: missing apps/web/src/lib/${lib}" >&2
    exit 1
  }
done
echo "OK: core deep-link libs"

bash "${ROOT}/scripts/verify-ekolojik-market-status-source.sh"

grep -q "EK-ROLL" "${ROOT}/docs/EKOLojIK_MARKET_PARITY_ROADMAP.md" || {
  echo "FAIL: roadmap missing EK-ROLL section" >&2
  exit 1
}
grep -q "verify-ekolojik-market-roll-manifest.sh" "${ROOT}/docs/EKOLojIK_MARKET_PARITY_ROADMAP.md" || {
  echo "FAIL: roadmap missing roll manifest script ref" >&2
  exit 1
}
grep -q "EK-LIVE" "${ROOT}/docs/EKOLojIK_MARKET_PARITY_ROADMAP.md" || {
  echo "FAIL: roadmap missing EK-LIVE section" >&2
  exit 1
}
grep -q "EK-CLEAN" "${ROOT}/docs/EKOLojIK_MARKET_PARITY_ROADMAP.md" || {
  echo "FAIL: roadmap missing EK-CLEAN section" >&2
  exit 1
}
grep -q "EK-CLOSE" "${ROOT}/docs/EKOLojIK_MARKET_PARITY_ROADMAP.md" || {
  echo "FAIL: roadmap missing EK-CLOSE section" >&2
  exit 1
}
grep -q "EK-DONE" "${ROOT}/docs/EKOLojIK_MARKET_PARITY_ROADMAP.md" || {
  echo "FAIL: roadmap missing EK-DONE section" >&2
  exit 1
}
echo "OK: roadmap EK-ROLL … EK-DONE"

bash "${ROOT}/scripts/verify-ekolojik-market-phase-pr-cleanup.sh"

echo "verify-ekolojik-market-roll-manifest: PASS"
