#!/usr/bin/env bash
# WebRTC Meet Faz 17 — SFU config + sağlık snapshot (mesh hâlâ aktif).
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
if "messaging_webrtc_meet_sfu_config_faz17" not in features:
    raise SystemExit("FAIL: messaging_webrtc_meet_sfu_config_faz17 eksik")
webrtc = d.get("webrtc") or {}
sfu = webrtc.get("sfuBackend") or {}
if sfu.get("meshOnly") is not True:
    raise SystemExit("FAIL: sfuBackend.meshOnly")
cap = webrtc.get("capacity") or {}
if cap.get("sfuMode") != "disabled":
    raise SystemExit(f"FAIL: capacity.sfuMode={cap.get('sfuMode')}")
planned = sfu.get("plannedMaxParticipants")
if not isinstance(planned, int) or planned < 4:
    raise SystemExit(f"FAIL: plannedMaxParticipants={planned}")
path = webrtc.get("sfuStatusPath") or ""
if "sfu/status" not in path:
    raise SystemExit(f"FAIL: sfuStatusPath={path}")
print("OK: faz17 sfu config snapshot (status)")
PY

echo "verify-messaging-webrtc-meet-faz17-sfu-config: PASS"
