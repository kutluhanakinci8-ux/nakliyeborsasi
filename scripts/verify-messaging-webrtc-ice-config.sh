#!/usr/bin/env bash
# JWT ile /messaging/webrtc/config — STUN/TURN listesi smoke.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
# shellcheck source=scripts/resolve-messaging-verify-jwt.sh
source "${ROOT}/scripts/resolve-messaging-verify-jwt.sh" || true

JWT="$(resolve_messaging_verify_jwt 2>/dev/null || true)"
if [[ -z "${JWT}" ]]; then
  echo "SKIP: messaging verify JWT yok"
  exit 0
fi

payload="$(curl -fsS -H "Authorization: Bearer ${JWT}" \
  "${API_BASE}/messaging/webrtc/config")"
export WEBRTC_CONFIG_JSON="${payload}"
python3 <<'PY'
import json, os, sys

d = json.loads(os.environ["WEBRTC_CONFIG_JSON"])
if d.get("signaling") != "redis_relay":
    print(f"NOT: signaling={d.get('signaling')} (REDIS_URL kontrol)", file=sys.stderr)
servers = d.get("iceServers") or []
if not servers:
    raise SystemExit("FAIL: iceServers boş")
urls = []
for s in servers:
    u = s.get("urls")
    if isinstance(u, list):
        urls.extend(u)
    elif u:
        urls.append(u)
has_stun = any(str(u).startswith("stun:") for u in urls)
has_turn = any(str(u).startswith("turn:") or str(u).startswith("turns:") for u in urls)
print(f"OK: iceServers={len(servers)} stun={has_stun} turn={has_turn}")
if os.environ.get("MESSAGING_WEBRTC_REQUIRE_TURN") == "1" and not has_turn:
    raise SystemExit("FAIL: MESSAGING_WEBRTC_REQUIRE_TURN=1 ama TURN yok")
PY

echo "verify-messaging-webrtc-ice-config: PASS"
