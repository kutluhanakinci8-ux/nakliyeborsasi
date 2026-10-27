#!/usr/bin/env bash
# WebRTC pilot — otomasyon öncesi kapı: status + ICE config + manuel adım listesi.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

echo "== WebRTC pilot checklist =="
payload="$(curl -fsS "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${payload}"
python3 -c "
import json, os, sys
d = json.loads(os.environ['MESSAGING_STATUS_JSON'])
w = d.get('webrtc') or {}
if w.get('signaling') != 'redis_relay':
    raise SystemExit(f'FAIL: webrtc.signaling={w.get(\"signaling\")}')
print('OK: redis_relay signaling')
"

API_BASE="${API_BASE}" bash "${ROOT}/scripts/verify-messaging-webrtc-ice-config.sh"
API_BASE="${API_BASE}" bash "${ROOT}/scripts/verify-messaging-webrtc-meet-faz6-gate.sh"

cat <<'TXT'

Manuel (aynı thread, en fazla 3 katılımcı):
  1) Sesli / görüntülü ara → precall → bağlan
  2) 2.–3. katılımcı: gelen arama veya aynı thread join
  3) Ekran paylaşımı, tepki, el kaldır, kayıt (onay kutusu), planlı görüşme
  4) 4. kişi → 409; bitir → leave + dahili özet
  5) Arşiv listesi → indir (varsa blob)

TXT
echo "verify-messaging-webrtc-pilot-checklist: PASS"
