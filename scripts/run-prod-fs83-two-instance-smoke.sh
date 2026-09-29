#!/usr/bin/env bash
# FS-8.3 prod: iki API instance + Redis fan-out doğrulama.
# Varsayılan: tek instance redisFanout smoke (SMOKE_SECOND_API_PORT yoksa SKIP).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

export MESSAGING_SSE_REDIS_FANOUT="${MESSAGING_SSE_REDIS_FANOUT:-1}"
export SMOKE_PRIMARY_API_BASE="${SMOKE_PRIMARY_API_BASE:-${API_BASE}}"

echo "== FS-8.3 prod two-instance checklist (API_BASE=${API_BASE}) =="
bash "${ROOT}/scripts/verify-messaging-sse-redis-fanout.sh" || {
  echo "FAIL: redis fan-out verify"
  exit 1
}
bash "${ROOT}/scripts/smoke-messaging-sse-two-instance.sh"
echo "FS-8.3 checklist: PASS"
