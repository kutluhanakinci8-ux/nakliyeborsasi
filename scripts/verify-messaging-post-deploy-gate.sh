#!/usr/bin/env bash
# Deploy sonrası mesajlaşma kapısı (JWT varsa tam, yoksa status-only).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
# shellcheck source=scripts/resolve-messaging-verify-jwt.sh
source "${ROOT}/scripts/resolve-messaging-verify-jwt.sh" || true
export_messaging_verify_jwt_aliases || true

echo "== Messaging post-deploy gate (API: ${API_BASE}) =="

bash "${ROOT}/scripts/verify-firma-sohbeti-fs1.sh"
bash "${ROOT}/scripts/verify-messaging-webrtc-pilot-checklist.sh"

JWT="$(resolve_messaging_verify_jwt 2>/dev/null || true)"
if [[ -n "${JWT}" ]]; then
  bash "${ROOT}/scripts/verify-messaging-thread-api-smoke.sh"
  bash "${ROOT}/scripts/verify-messaging-attachment-preview.sh"
  bash "${ROOT}/scripts/verify-messaging-mobile-oauth-bridge.sh" || true
else
  echo "SKIP: JWT yok — thread/attachment/mobile OAuth smoke atlandı"
fi

echo "OK: messaging post-deploy gate"
