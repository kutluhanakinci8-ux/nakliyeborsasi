#!/usr/bin/env bash
# WebRTC Meet Faz 24 — RN RTCView + arka plan metadata.
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
if "messaging_webrtc_meet_rn_rtc_view_faz24" not in features:
    raise SystemExit("FAIL: faz24 feature")
media = ((d.get("webrtc") or {}).get("nativeRtcBridge") or {}).get("mediaModule") or {}
rv = media.get("rnRemoteVideo") or {}
if rv.get("rtcViewGlobal") != "RTCView":
    raise SystemExit("FAIL: rtcViewGlobal")
if rv.get("backgroundPausePoll") is not True:
    raise SystemExit("FAIL: backgroundPausePoll")
print("OK: faz24 rtc view (status)")
PY

bash "${ROOT}/scripts/verify-messaging-webrtc-dev-client-ci.sh"
echo "verify-messaging-webrtc-meet-faz24-rtc-view: PASS"
