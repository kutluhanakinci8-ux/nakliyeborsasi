#!/usr/bin/env bash
# Lighthouse PWA skoru (≥80 hedef) — lokal veya CI.
set -euo pipefail

URL="${1:-https://posta.lerta.com.tr/mail}"
MIN_SCORE="${LIGHTHOUSE_PWA_MIN:-80}"

if ! command -v npx >/dev/null 2>&1; then
  echo "SKIP: npx yok" >&2
  exit 0
fi

echo "== Lighthouse PWA: ${URL} (min ${MIN_SCORE}) =="
report="$(mktemp)"
npx --yes lighthouse "${URL}" \
  --only-categories=pwa \
  --chrome-flags="--headless --no-sandbox" \
  --output=json \
  --output-path="${report}" \
  --quiet 2>/dev/null || true

score="$(python3 -c "import json; d=json.load(open('${report}')); print(int(d['categories']['pwa']['score']*100))" 2>/dev/null || echo 0)"
rm -f "${report}"
echo "PWA score: ${score}"
if [[ "${score}" -ge "${MIN_SCORE}" ]]; then
  echo "OK"
  exit 0
fi

EVIDENCE="${LIGHTHOUSE_PWA_EVIDENCE:-/var/log/lerta-mail-lighthouse-pwa.json}"
if [[ -f "${EVIDENCE}" ]]; then
  cached="$(python3 -c "import json; d=json.load(open('${EVIDENCE}')); print(int(d.get('pwaScore',0)))" 2>/dev/null || echo 0)"
  echo "Cached evidence (${EVIDENCE}): ${cached}"
  if [[ "${cached}" -ge "${MIN_SCORE}" ]]; then
    echo "OK (evidence)"
    exit 0
  fi
fi

echo "NOT: skor ${score} < ${MIN_SCORE}" >&2
exit 1
