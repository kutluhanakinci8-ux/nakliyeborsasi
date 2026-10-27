#!/usr/bin/env bash
# STT-OSS-4: parallel health probes (concurrency / reachability smoke).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
URL="${API_BASE}/messaging/integration/voice-stt/health"
N="${PARALLEL_STT_HEALTH:-4}"

pids=()
for _ in $(seq 1 "$N"); do
  pids+=($(
    curl -fsS "$URL" >/dev/null &
    echo $!
  ))
done
for pid in "${pids[@]}"; do
  wait "$pid"
done
echo "parallel-messaging-voice-stt-smoke: ${N} health OK"
