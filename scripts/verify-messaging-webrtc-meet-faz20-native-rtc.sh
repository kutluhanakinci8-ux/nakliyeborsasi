#!/usr/bin/env bash
# WebRTC Meet Faz 20 — native RTC bridge (Expo handoff).
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
if "messaging_webrtc_meet_native_rtc_faz20" not in features:
    raise SystemExit("FAIL: messaging_webrtc_meet_native_rtc_faz20 eksik")
bridge = (d.get("webrtc") or {}).get("nativeRtcBridge") or {}
if bridge.get("mode") != "expo_webview_handoff":
    raise SystemExit(f"FAIL: mode={bridge.get('mode')}")
if bridge.get("deepLinkParam") != "nativeRtc":
    raise SystemExit("FAIL: deepLinkParam")
path = bridge.get("handshakePath") or ""
if "native-bridge/handshake" not in path:
    raise SystemExit(f"FAIL: handshakePath={path}")
print("OK: faz20 native rtc bridge (status)")
PY

echo "verify-messaging-webrtc-meet-faz20-native-rtc: PASS"
