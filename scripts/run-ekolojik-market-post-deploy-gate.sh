#!/usr/bin/env bash
# EK-LIVE: main deploy sonrası prod public smoke + EK-U4 rubrik (secret gerekmez).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE="${EKOLOJIK_API_BASE:-https://app.lerta.com.tr/api/v1}"
WEB_BASE="${EKOLOJIK_WEB_PUBLIC_URL:-https://app.lerta.com.tr}"

export EKOLOJIK_API_BASE="${API_BASE}"
export EKOLOJIK_WEB_PUBLIC_URL="${WEB_BASE}"
export EKOLOJIK_SMOKE_EXPECT_PHASE="${EKOLOJIK_SMOKE_EXPECT_PHASE:-ek-u4}"
export EK_U4_FULL="${EK_U4_FULL:-0}"

echo "== Ekolojik post-deploy gate (EK-LIVE) =="
echo "API_BASE=${API_BASE}"
echo "WEB_BASE=${WEB_BASE}"

export EK_PROD_ROLLOUT_STRICT="${EK_PROD_ROLLOUT_STRICT:-1}"
bash "${ROOT}/scripts/verify-ekolojik-market-prod-rollout.sh"

if [[ "${EK_LIVE_SKIP_CLOSE:-0}" == "1" ]]; then
  echo "SKIP: EK_LIVE_SKIP_CLOSE=1 — close checklist atlandı"
else
  bash "${ROOT}/scripts/run-ekolojik-market-parity-close-checklist.sh"
fi

echo "run-ekolojik-market-post-deploy-gate: PASS"
