#!/usr/bin/env bash
# WebRTC Meet Faz 21 — native media module capabilities.
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
if "messaging_webrtc_meet_native_module_faz21" not in features:
    raise SystemExit("FAIL: messaging_webrtc_meet_native_module_faz21 eksik")
bridge = (d.get("webrtc") or {}).get("nativeRtcBridge") or {}
media = bridge.get("mediaModule") or {}
if media.get("rnWebRtcTarget") != "react_native_webrtc":
    raise SystemExit("FAIL: rnWebRtcTarget")
path = media.get("capabilitiesPath") or ""
if "native-bridge/capabilities" not in path:
    raise SystemExit(f"FAIL: capabilitiesPath={path}")
print("OK: faz21 native media module (status)")
PY

echo "verify-messaging-webrtc-meet-faz21-native-module: PASS"
