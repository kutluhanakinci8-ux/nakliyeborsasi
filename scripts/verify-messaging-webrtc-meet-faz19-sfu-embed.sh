#!/usr/bin/env bash
# WebRTC Meet Faz 19 — SFU tarayıcı gömme + deep link metadata.
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
if "messaging_webrtc_meet_sfu_embed_faz19" not in features:
    raise SystemExit("FAIL: messaging_webrtc_meet_sfu_embed_faz19 eksik")
embed = (d.get("webrtc") or {}).get("sfuEmbed") or {}
if embed.get("enabled") is not True:
    raise SystemExit("FAIL: sfuEmbed.enabled")
if embed.get("deepLinkParam") != "sfuPilot":
    raise SystemExit(f"FAIL: deepLinkParam={embed.get('deepLinkParam')}")
if embed.get("localMediaPreview") is not True:
    raise SystemExit("FAIL: localMediaPreview")
print("OK: faz19 sfu embed (status)")
PY

echo "verify-messaging-webrtc-meet-faz19-sfu-embed: PASS"
