#!/usr/bin/env bash
# FS-12: kanal ve mağaza — status bayrakları + Capacitor stub.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

echo "== FS-12 firma sohbeti verify =="
payload="$(curl -fsS "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${payload}"
python3 "${ROOT}/scripts/messaging-status-from-env.py" fs12
test -f "${ROOT}/docs/MESSAGING_FS12_CHANNELS.md"
test -f "${ROOT}/apps/web/capacitor.config.ts"
echo "FS-12 verify: PASS"
