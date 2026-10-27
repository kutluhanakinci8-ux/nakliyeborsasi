#!/usr/bin/env bash
# WebRTC Meet Faz 16 — SFU overflow intent (beta talebi).
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
if "messaging_webrtc_meet_sfu_intent_faz16" not in features:
    raise SystemExit("FAIL: messaging_webrtc_meet_sfu_intent_faz16 eksik")
cap = (d.get("webrtc") or {}).get("capacity") or {}
intent = cap.get("sfuOverflowIntent") or {}
if not intent.get("enabled"):
    raise SystemExit("FAIL: capacity.sfuOverflowIntent.enabled")
path = intent.get("registerPathTemplate") or ""
if "overflow-intent" not in path:
    raise SystemExit(f"FAIL: registerPathTemplate={path}")
print("OK: faz16 sfu overflow intent (status)")
PY

echo "verify-messaging-webrtc-meet-faz16-sfu-intent: PASS"
