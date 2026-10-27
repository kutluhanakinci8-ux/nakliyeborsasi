#!/usr/bin/env bash
# WebRTC Meet Faz 12 — TURN prod kapısı (opsiyonel zorunlu).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

payload="$(curl -fsS "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${payload}"
python3 <<'PY'
import json, os, sys

d = json.loads(os.environ["MESSAGING_STATUS_JSON"])
features = d.get("features") or []
if "messaging_webrtc_meet_turn_prod_faz12" not in features:
    raise SystemExit("FAIL: messaging_webrtc_meet_turn_prod_faz12 yok")
w = d.get("webrtc") or {}
caps = w.get("iceCaps") or {}
tm = w.get("turnMonitor") or {}
turn_ok = bool(caps.get("turnCredentialsConfigured")) or bool(tm.get("enabled"))
if os.environ.get("MESSAGING_MEET_REQUIRE_TURN_PROD") == "1" and not turn_ok:
    raise SystemExit("FAIL: MESSAGING_MEET_REQUIRE_TURN_PROD=1 ama TURN/monitor hazır değil")
if not turn_ok:
    print("WARN: TURN henüz yapılandırılmamış — docs/messaging/WEBRTC-TURN-VPS.md", file=sys.stderr)
else:
    print("OK: TURN prod hazır")
print("OK: faz12 feature")
PY

echo "verify-messaging-webrtc-meet-faz12-turn-prod: PASS"
