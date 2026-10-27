#!/usr/bin/env bash
# WebRTC Meet Faz 25 — program GA closure.
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
if "messaging_webrtc_meet_program_closure_faz25" not in features:
    raise SystemExit("FAIL: faz25 feature")
prog = (d.get("webrtc") or {}).get("meetProgram") or {}
if prog.get("phase") != "ga_ready":
    raise SystemExit(f"FAIL: phase={prog.get('phase')}")
if prog.get("totalPhases") != 25:
    raise SystemExit(f"FAIL: totalPhases={prog.get('totalPhases')}")
print("OK: faz25 program closure (status)")
PY

echo "verify-messaging-webrtc-meet-faz25-closure: PASS"
