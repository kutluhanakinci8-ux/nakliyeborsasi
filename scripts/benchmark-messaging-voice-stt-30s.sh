#!/usr/bin/env bash
# STT-OSS-3 ops benchmark: 30s mono WAV → local Whisper HTTP (SLA rehberi).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STT_URL="${MESSAGING_VOICE_STT_API_URL:-http://127.0.0.1:9010/asr}"
MODEL="${MESSAGING_VOICE_STT_MODEL:-base}"
LANG="${MESSAGING_VOICE_STT_DEFAULT_LANGUAGE:-tr}"
TMP="$(mktemp -d)"
WAV="${TMP}/voice-30s.wav"
trap 'rm -rf "${TMP}"' EXIT

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "SKIP: ffmpeg yok — benchmark atlandı"
  exit 0
fi

ffmpeg -hide_banner -loglevel error -f lavfi -i anullsrc=r=16000:cl=mono -t 30 -y "${WAV}"

start_ms="$(date +%s%3N)"
response="$(curl -fsS -X POST "${STT_URL}" \
  -H "Authorization: Bearer ${MESSAGING_VOICE_STT_API_KEY:-local-stt-internal}" \
  -F "file=@${WAV}" \
  -F "model=${MODEL}" \
  -F "language=${LANG}" \
  -F "response_format=json")"
end_ms="$(date +%s%3N)"
elapsed=$((end_ms - start_ms))

echo "$response" | python3 -c "import json,sys; d=json.load(sys.stdin); print('text_len', len((d.get('text') or '')))"
echo "elapsed_ms=${elapsed} (30s audio, model=${MODEL}, lang=${LANG})"
if [[ "${elapsed}" -gt 120000 ]]; then
  echo "WARN: >120s — SLA rehberi aşıldı (CPU/model yükseltme düşünün)"
fi
echo "benchmark-messaging-voice-stt-30s: done"
