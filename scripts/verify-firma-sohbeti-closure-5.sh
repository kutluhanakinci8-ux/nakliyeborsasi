#!/usr/bin/env bash
# Önerilen 5 kapanış adımı — tek komut özeti.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
# shellcheck source=scripts/resolve-messaging-test-jwt.sh
source "${ROOT}/scripts/resolve-messaging-test-jwt.sh" || true

export PILOT_NPS_STRICT=1

echo "== 1/5 Pilot NPS (strict) =="
bash "${ROOT}/scripts/verify-firma-sohbeti-pilot-nps.sh"

echo ""
echo "== 2/5 Excellence showcase (API) =="
if [[ -x "${ROOT}/scripts/verify-firma-sohbeti-excellence-showcase.sh" ]]; then
  bash "${ROOT}/scripts/verify-firma-sohbeti-excellence-showcase.sh"
else
  for p in fs8 fs9 fs10 fs11 fs12; do
    bash "${ROOT}/scripts/verify-firma-sohbeti-${p}.sh"
  done
fi

echo ""
echo "== 3/5 Lighthouse + axe (FS-10) =="
bash "${ROOT}/scripts/verify-lighthouse-messaging-mobile.sh" || true
bash "${ROOT}/scripts/verify-axe-messaging.sh" || true

echo ""
echo "== 4/5 FS-8.3 SSE two-instance =="
bash "${ROOT}/scripts/run-prod-fs83-two-instance-smoke.sh"

echo ""
echo "== 5/5 FS-12 WA bridge sandbox =="
bash "${ROOT}/scripts/verify-messaging-wa-bridge-sandbox.sh"

echo ""
echo "Firma sohbeti closure-5: tamamlandı (Lighthouse/axe evidence yoksa NOT logları kontrol edin)"
