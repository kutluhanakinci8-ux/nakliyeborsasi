#!/usr/bin/env bash
# Prod: MESSAGING_SSE_REDIS_FANOUT=1 ise /messaging/status sse.redisFanout=true olmalı.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

if [[ "${MESSAGING_SSE_REDIS_FANOUT:-}" != "1" ]]; then
  echo "SKIP: MESSAGING_SSE_REDIS_FANOUT!=1"
  exit 0
fi

export STATUS_JSON
STATUS_JSON="$(curl -fsS "${API_BASE}/messaging/status")"
export STATUS_JSON
python3 -c "
import json, os, sys
data = json.loads(os.environ['STATUS_JSON'])
fanout = (data.get('sse') or {}).get('redisFanout')
if fanout is not True:
    raise SystemExit(f'FAIL: sse.redisFanout={fanout!r} (beklenen True)')
print('OK: sse.redisFanout=true')
"
