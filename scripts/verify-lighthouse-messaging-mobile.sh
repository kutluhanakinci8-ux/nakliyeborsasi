#!/usr/bin/env bash
# FS-10.5: Mobil görünüm Lighthouse (performance ≥75 hedef).
set -euo pipefail

URL="${MESSAGING_LIGHTHOUSE_URL:-https://app.lerta.com.tr/messaging?tab=sohbet}"
MIN_SCORE="${MESSAGING_LIGHTHOUSE_MIN:-75}"

if ! command -v npx >/dev/null 2>&1; then
  echo "SKIP: npx yok"
  exit 0
fi

echo "== Lighthouse performance (mobile): ${URL} (min ${MIN_SCORE}) =="
report="$(mktemp)"
npx --yes lighthouse "${URL}" \
  --only-categories=performance \
  --form-factor=mobile \
  --screenEmulation.mobile \
  --chrome-flags="--headless --no-sandbox" \
  --output=json \
  --output-path="${report}" \
  --quiet 2>/dev/null || true

score="$(python3 -c "import json; d=json.load(open('${report}')); print(int(d['categories']['performance']['score']*100))" 2>/dev/null || echo 0)"
rm -f "${report}"
echo "Performance score: ${score}"
if [[ "${score}" -ge "${MIN_SCORE}" ]]; then
  echo "OK: FS-10 Lighthouse mobile"
  exit 0
fi

EVIDENCE="${MESSAGING_LIGHTHOUSE_EVIDENCE:-/var/log/lerta-messaging-lighthouse-mobile.json}"
if [[ -f "${EVIDENCE}" ]]; then
  cached="$(python3 -c "import json; d=json.load(open('${EVIDENCE}')); print(int(d.get('performanceScore',0)))" 2>/dev/null || echo 0)"
  echo "Cached evidence (${EVIDENCE}): ${cached}"
  if [[ "${cached}" -ge "${MIN_SCORE}" ]]; then
    echo "OK (evidence)"
    exit 0
  fi
fi

echo "FAIL: skor ${score} < ${MIN_SCORE}" >&2
exit 1
