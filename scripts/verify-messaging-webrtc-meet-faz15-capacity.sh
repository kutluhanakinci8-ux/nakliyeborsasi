#!/usr/bin/env bash
# WebRTC Meet Faz 15 — kapasite politikası (mesh ≤3, SFU kapalı).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

payload="$(curl -fsS "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${payload}"
python3 <<'PY'
import json, os, sys

d = json.loads(os.environ["MESSAGING_STATUS_JSON"])
features = set(d.get("features") or [])
if "messaging_webrtc_meet_capacity_faz15" not in features:
    raise SystemExit("FAIL: messaging_webrtc_meet_capacity_faz15 eksik")
webrtc = d.get("webrtc") or {}
cap = webrtc.get("capacity") or {}
if cap.get("topology") != "mesh_p2p":
    raise SystemExit(f"FAIL: capacity.topology={cap.get('topology')}")
if cap.get("sfuMode") != "disabled":
    raise SystemExit("FAIL: sfuMode beklenen disabled")
mesh = cap.get("meshMaxParticipants")
if mesh != 3:
    raise SystemExit(f"FAIL: meshMaxParticipants={mesh}")
if cap.get("effectiveMaxParticipants") != 3:
    raise SystemExit("FAIL: effectiveMaxParticipants")
if cap.get("overflowPolicy") != "reject_join":
    raise SystemExit("FAIL: overflowPolicy")
print("OK: faz15 capacity policy (status)")
PY

echo "verify-messaging-webrtc-meet-faz15-capacity: PASS"
