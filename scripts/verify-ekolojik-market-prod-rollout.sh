#!/usr/bin/env bash
# EK-PROD: prod API rollout durumu (404 = henüz deploy; 200 = smoke).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE="${EKOLOJIK_API_BASE:-https://app.lerta.com.tr/api/v1}"
WEB_BASE="${EKOLOJIK_WEB_PUBLIC_URL:-https://app.lerta.com.tr}"
STRICT="${EK_PROD_ROLLOUT_STRICT:-0}"

echo "== Ekolojik prod rollout verify (EK-PROD) =="
echo "API_BASE=${API_BASE}"

code="$(curl -sS -o /tmp/ekolojik-prod-status.json -w "%{http_code}" \
  --connect-timeout 8 --max-time 25 \
  "${API_BASE}/public/ekolojik-market/status" || echo "000")"

if [[ "${code}" == "404" || "${code}" == "000" ]]; then
  echo "NOT_DEPLOYED: public status HTTP ${code} — VPS: DEPLOY_BRANCH=main bash scripts/deploy-production-vps.sh"
  if [[ "${STRICT}" == "1" ]]; then
    exit 1
  fi
  echo "verify-ekolojik-market-prod-rollout: PASS (not deployed, strict=0)"
  exit 0
fi

if [[ "${code}" != "200" ]]; then
  echo "FAIL: unexpected HTTP ${code}" >&2
  cat /tmp/ekolojik-prod-status.json 2>/dev/null || true
  exit 1
fi

export EKOLOJIK_API_BASE="${API_BASE}"
export EKOLOJIK_WEB_PUBLIC_URL="${WEB_BASE}"
export EKOLOJIK_SMOKE_EXPECT_PHASE="${EKOLOJIK_SMOKE_EXPECT_PHASE:-ek-u4}"
bash "${ROOT}/scripts/smoke-ekolojik-market-parity.sh"
echo "verify-ekolojik-market-prod-rollout: PASS (prod live)"
