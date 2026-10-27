#!/usr/bin/env bash
# WebRTC Meet Faz 1–8 — status feature kapısı (deploy smoke).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

REQUIRED=(
  messaging_webrtc_signaling_relay
  messaging_webrtc_mesh_three
  messaging_webrtc_meet_core_faz1
  messaging_webrtc_meet_hd_faz2
  messaging_webrtc_meet_biz_faz3
  messaging_webrtc_meet_ops_faz4
  messaging_webrtc_meet_reliability_faz5
  messaging_webrtc_meet_prod_net_faz6
  messaging_webrtc_meet_compliance_faz7
  messaging_webrtc_meet_qa_gate_faz8
  messaging_webrtc_meet_realtime_faz9
  messaging_webrtc_meet_mobile_faz10
  messaging_webrtc_meet_enterprise_faz11
  messaging_webrtc_meet_turn_prod_faz12
  messaging_webrtc_meet_native_shell_faz13
  messaging_webrtc_meet_ediscovery_faz14
)

payload="$(curl -fsS "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${payload}"
export REQUIRED_FEATURES="${REQUIRED[*]}"
python3 <<'PY'
import json, os, sys

d = json.loads(os.environ["MESSAGING_STATUS_JSON"])
features = set(d.get("features") or [])
required = os.environ["REQUIRED_FEATURES"].split()
missing = [f for f in required if f not in features]
if missing:
    raise SystemExit(f"FAIL: eksik features: {', '.join(missing)}")
print(f"OK: meet faz gate ({len(required)} flags)")
PY

API_BASE="${API_BASE}" bash "${ROOT}/scripts/verify-messaging-webrtc-meet-faz6-gate.sh"
API_BASE="${API_BASE}" bash "${ROOT}/scripts/verify-messaging-webrtc-meet-faz12-turn-prod.sh"
echo "verify-messaging-webrtc-meet-faz-gate: PASS"
