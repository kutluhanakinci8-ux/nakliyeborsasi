#!/usr/bin/env bash
# WebRTC Meet Faz 22 — RN native mesh pilot API metadata.
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
if "messaging_webrtc_meet_rn_webrtc_pilot_faz22" not in features:
    raise SystemExit("FAIL: messaging_webrtc_meet_rn_webrtc_pilot_faz22 eksik")
bridge = (d.get("webrtc") or {}).get("nativeRtcBridge") or {}
media = bridge.get("mediaModule") or {}
pilot = media.get("nativeMeshPilot") or {}
if not pilot.get("enabled"):
    raise SystemExit("FAIL: nativeMeshPilot.enabled")
path = pilot.get("pathTemplate") or ""
if "native-pilot/session" not in path:
    raise SystemExit(f"FAIL: pathTemplate={path}")
print("OK: faz22 rn native mesh pilot (status)")
PY

echo "verify-messaging-webrtc-meet-faz22-rn-pilot: PASS"
