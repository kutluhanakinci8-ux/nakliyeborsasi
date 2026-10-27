#!/usr/bin/env bash
# WebRTC Meet — dev client bootstrap + closure doc (CI smoke).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test -f "${ROOT}/apps/mobile/lertaRnWebRtcBootstrap.example.js"
test -f "${ROOT}/docs/messaging/WEBRTC-MEET-CLOSURE.md"
test -f "${ROOT}/docs/messaging/WEBRTC-RN-WEBRTC-DEV-CLIENT.md"
grep -q "RTCView" "${ROOT}/apps/mobile/lertaRnWebRtcBootstrap.example.js"
echo "verify-messaging-webrtc-dev-client-ci: PASS"
