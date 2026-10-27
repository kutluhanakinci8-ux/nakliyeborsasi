#!/usr/bin/env bash
# STT-OSS-7 — self-hosted STT program gate (status + health + ops smoke).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

GATE_FEATURES=(
  messaging_voice_note_faz1
  messaging_voice_transcribe_manual_faz1
  messaging_voice_transcribe_advanced_faz2
  messaging_voice_transcribe_auto_faz3
  messaging_voice_bridge_stt_faz1
  messaging_voice_stt_local_faz1
  messaging_voice_stt_tr_quality_faz1
  messaging_voice_stt_reliability_faz1
  messaging_voice_stt_oss_gate_faz7
)

echo "== STT-OSS-7 gate (API: ${API_BASE}) =="

status="$(curl -fsS "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${status}"
export STT_OSS_GATE_REQUIRED_FEATURES="${GATE_FEATURES[*]}"
python3 <<'PY'
import json, os, sys

d = json.loads(os.environ["MESSAGING_STATUS_JSON"])
features = set(d.get("features") or [])
required = os.environ["STT_OSS_GATE_REQUIRED_FEATURES"].split()
missing = [f for f in required if f not in features]
vn = d.get("voiceNote") or {}
if not vn.get("transcribeFaz1Enabled"):
    missing.append("voiceNote.transcribeFaz1Enabled")
if not vn.get("sttConfigured"):
    missing.append("voiceNote.sttConfigured")
if vn.get("sttProvider") not in ("local", "openai"):
    missing.append(f"voiceNote.sttProvider={vn.get('sttProvider')}")
if vn.get("sttOssGateFaz7Enabled") is not True:
    missing.append("voiceNote.sttOssGateFaz7Enabled")
if vn.get("sttTrQualityFaz1Enabled") is not True:
    missing.append("voiceNote.sttTrQualityFaz1Enabled")
if missing:
    print("FAIL:", ", ".join(missing))
    sys.exit(1)
print("OK: OSS feature gate", len(required), "flags + voiceNote STT snapshot")
PY

bash "${ROOT}/scripts/verify-messaging-voice-stt-prod.sh"
bash "${ROOT}/scripts/verify-messaging-voice-stt-oss2.sh"
bash "${ROOT}/scripts/verify-messaging-voice-stt-oss3.sh"
bash "${ROOT}/scripts/verify-messaging-voice-stt-oss4.sh"
bash "${ROOT}/scripts/verify-messaging-voice-stt-oss6.sh"

health="$(curl -fsS "${API_BASE}/messaging/integration/voice-stt/health")"
echo "$health" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert d.get('configured'), 'health not configured'
assert d.get('reachable'), 'STT not reachable'
print('OK: health latencyMs', d.get('latencyMs'))
"

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^lerta-messaging-local-stt$'; then
  bash "${ROOT}/scripts/verify-messaging-voice-stt-local.sh"
else
  echo "SKIP: lerta-messaging-local-stt yok — loopback transcript smoke (VPS deploy dışı CI)"
fi

test -f "${ROOT}/docs/messaging/VOICE-TRANSCRIBE-STT-OSS-7-CHECKLIST.md"
echo "verify-messaging-voice-stt-oss-gate: PASS"
