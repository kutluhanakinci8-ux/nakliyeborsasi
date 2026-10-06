#!/usr/bin/env bash
# EK-LIVE-VERIFY: prod canlı — strict rollout + EK-U4 close (deploy sonrası operatör).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export EKOLOJIK_API_BASE="${EKOLOJIK_API_BASE:-https://app.lerta.com.tr/api/v1}"
export EKOLOJIK_WEB_PUBLIC_URL="${EKOLOJIK_WEB_PUBLIC_URL:-https://app.lerta.com.tr}"
export EK_PROD_ROLLOUT_STRICT="${EK_PROD_ROLLOUT_STRICT:-1}"

echo "== Ekolojik live verify (EK-LIVE-VERIFY) =="
bash "${ROOT}/scripts/verify-ekolojik-market-prod-rollout.sh"
bash "${ROOT}/scripts/run-ekolojik-market-post-deploy-gate.sh"
echo "run-ekolojik-market-live-verify: PASS"
