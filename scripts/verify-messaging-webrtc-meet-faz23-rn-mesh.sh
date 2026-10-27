#!/usr/bin/env bash
# WebRTC Meet Faz 23 — RN mesh media metadata.
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
if "messaging_webrtc_meet_rn_mesh_media_faz23" not in features:
    raise SystemExit("FAIL: messaging_webrtc_meet_rn_mesh_media_faz23 eksik")
bridge = (d.get("webrtc") or {}).get("nativeRtcBridge") or {}
media = bridge.get("mediaModule") or {}
mesh = media.get("rnMeshMedia") or {}
if mesh.get("stack") != "rn_peer_connection":
    raise SystemExit(f"FAIL: stack={mesh.get('stack')}")
if mesh.get("globalInject") != "LertaRnWebRTC":
    raise SystemExit("FAIL: globalInject")
print("OK: faz23 rn mesh media (status)")
PY

echo "verify-messaging-webrtc-meet-faz23-rn-mesh: PASS"
