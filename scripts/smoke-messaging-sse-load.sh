#!/usr/bin/env bash
# SSE bağlantı limiti + p95 bağlantı süresi smoke (lokal API).
set -euo pipefail
API_BASE="${API_BASE:-http://127.0.0.1:3000/api/v1}"
JWT="${MESSAGING_SSE_JWT:-}"
CONCURRENCY="${MESSAGING_SSE_LOAD_CONCURRENCY:-5}"

status="$(curl -fsS "${API_BASE}/messaging/status")"
echo "$status" | python3 -c "import sys,json; d=json.load(sys.stdin); print('sse stats', d.get('sse')); print('redisFanout', d.get('sse',{}).get('redisFanout'))"

if [[ -z "$JWT" ]]; then
  echo "SKIP: MESSAGING_SSE_JWT yok (ticket + timing atlandı)"
  exit 0
fi

timings_file="$(mktemp)"
trap 'rm -f "$timings_file"' EXIT

for _ in $(seq 1 "$CONCURRENCY"); do
  (
    start_ms="$(python3 -c 'import time; print(int(time.time()*1000))')"
    ticket="$(curl -fsS -H "Authorization: Bearer $JWT" -X POST \
      "${API_BASE}/messaging/stream/ticket?lang=tr" | python3 -c "import sys,json; print(json.load(sys.stdin)['ticket'])")"
    code="$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 \
      "${API_BASE}/messaging/stream?ticket=${ticket}")"
    end_ms="$(python3 -c 'import time; print(int(time.time()*1000))')"
    echo "$((end_ms - start_ms)) $code" >> "$timings_file"
  ) &
done
wait

python3 <<'PY' "$timings_file"
import sys
rows = []
for line in open(sys.argv[1]):
    parts = line.strip().split()
    if len(parts) != 2:
        continue
    ms, code = int(parts[0]), parts[1]
    if code != "200":
        raise SystemExit(f"FAIL: HTTP {code}")
    rows.append(ms)
if not rows:
    raise SystemExit("FAIL: no timings")
rows.sort()
p95 = rows[int(max(0, len(rows) * 0.95 - 1))]
print(f"OK: {len(rows)} connections, p95={p95}ms max={max(rows)}ms")
if p95 > 8000:
    raise SystemExit(f"FAIL: p95 {p95}ms > 8000ms")
PY
