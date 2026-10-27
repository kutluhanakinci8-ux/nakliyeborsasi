#!/usr/bin/env bash
# WebRTC Meet Faz 6 — prod ağ kapısı (status + ICE + turnMonitor).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

payload="$(curl -fsS "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${payload}"
python3 <<'PY'
import json, os, sys

d = json.loads(os.environ["MESSAGING_STATUS_JSON"])
features = d.get("features") or []
if "messaging_webrtc_meet_prod_net_faz6" not in features:
    raise SystemExit("FAIL: messaging_webrtc_meet_prod_net_faz6 feature yok")
w = d.get("webrtc") or {}
caps = w.get("iceCaps") or {}
tm = w.get("turnMonitor") or {}
if caps.get("usingDefaultStunOnly") and not caps.get("turnCredentialsConfigured"):
    print("WARN: yalnızca varsayılan STUN — üretimde TURN önerilir", file=sys.stderr)
if not tm.get("enabled"):
    print("WARN: turnMonitor disabled (TURN veya TURN_ALLOCATIONS_HINT yok)", file=sys.stderr)
else:
    print(f"OK: turnMonitor source={tm.get('source')} ok={tm.get('ok')}")
print("OK: faz6 feature")
PY

API_BASE="${API_BASE}" bash "${ROOT}/scripts/verify-messaging-webrtc-ice-config.sh"
echo "verify-messaging-webrtc-meet-faz6-gate: PASS"
