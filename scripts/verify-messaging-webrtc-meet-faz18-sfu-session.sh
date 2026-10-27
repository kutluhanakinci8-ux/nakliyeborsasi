#!/usr/bin/env bash
# WebRTC Meet Faz 18 — SFU session join API (signaling bundle).
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
if "messaging_webrtc_meet_sfu_session_faz18" not in features:
    raise SystemExit("FAIL: messaging_webrtc_meet_sfu_session_faz18 eksik")
sfu = (d.get("webrtc") or {}).get("sfuBackend") or {}
session = sfu.get("sessionJoin") or {}
path = session.get("pathTemplate") or ""
if "sfu/session" not in path:
    raise SystemExit(f"FAIL: sessionJoin.pathTemplate={path}")
if sfu.get("meshOnly") is not True:
    raise SystemExit("FAIL: meshOnly")
print("OK: faz18 sfu session join (status)")
PY

echo "verify-messaging-webrtc-meet-faz18-sfu-session: PASS"
