#!/usr/bin/env bash
# FS-8.3: İki API instance — farklı instanceId, redisFanout=true (aynı Redis).
# Kullanım (VPS):
#   SMOKE_SECOND_API_PORT=3012 MESSAGING_SSE_INSTANCE_ID_B=smoke-b \
#     bash scripts/smoke-messaging-sse-two-instance.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

PRIMARY_PORT="${SMOKE_PRIMARY_API_PORT:-3010}"
SECOND_PORT="${SMOKE_SECOND_API_PORT:-}"
PRIMARY_BASE="${SMOKE_PRIMARY_API_BASE:-http://127.0.0.1:${PRIMARY_PORT}/api/v1}"
SECOND_BASE="${SMOKE_SECOND_API_BASE:-http://127.0.0.1:${SECOND_PORT}/api/v1}"

echo "== FS-8.3 iki instance SSE smoke =="

primary="$(curl -fsS "${PRIMARY_BASE}/messaging/status")"
python3 - "${primary}" <<'PY'
import json, sys
d = json.loads(sys.argv[1])
sse = d.get("sse") or {}
if sse.get("redisFanout") is not True:
    raise SystemExit(f"FAIL: primary redisFanout={sse.get('redisFanout')}")
print("OK: primary redisFanout=true instanceId=", sse.get("instanceId"))
PY

if [[ -z "${SECOND_PORT}" ]]; then
  echo "SKIP: SMOKE_SECOND_API_PORT yok (tek instance; fan-out kod yolu doğrulandı)"
  echo "İpucu: ikinci PM2 ile PORT=3012 MESSAGING_SSE_INSTANCE_ID=smoke-b"
  exit 0
fi

if ! curl -fsS "${SECOND_BASE}/health" >/dev/null 2>&1; then
  echo "FAIL: ikinci API ${SECOND_BASE}/health yanıt vermiyor"
  exit 1
fi

second="$(curl -fsS "${SECOND_BASE}/messaging/status")"
python3 - "${primary}" "${second}" <<'PY'
import json, sys
a, b = json.loads(sys.argv[1]), json.loads(sys.argv[2])
sa, sb = a.get("sse") or {}, b.get("sse") or {}
if sb.get("redisFanout") is not True:
    raise SystemExit(f"FAIL: secondary redisFanout={sb.get('redisFanout')}")
ida, idb = sa.get("instanceId"), sb.get("instanceId")
if not ida or not idb or ida == idb:
    raise SystemExit(f"FAIL: instanceId aynı veya boş ({ida!r} vs {idb!r})")
print(f"OK: iki instance redisFanout=true ({ida} / {idb})")
PY

echo "FS-8.3 two-instance smoke: PASS"
