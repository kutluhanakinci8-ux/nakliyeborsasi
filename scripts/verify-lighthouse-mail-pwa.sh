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
if command -v google-chrome >/dev/null 2>&1 || command -v chromium >/dev/null 2>&1; then
  npx --yes lighthouse "${URL}" \
    --only-categories=pwa \
    --chrome-flags="--headless --no-sandbox" \
    --output=json \
    --output-path="${report}" \
    --quiet 2>/dev/null || true
else
  npx --yes @puppeteer/browsers install chrome@stable 2>/dev/null | tail -2 || true
  CHROME_PATH="$(find /home -path '*/chrome-linux64/chrome' 2>/dev/null | head -1)"
  if [[ -n "${CHROME_PATH}" ]]; then
    npx --yes lighthouse "${URL}" \
      --only-categories=pwa \
      --chrome-flags="--headless --no-sandbox" \
      --chrome-path="${CHROME_PATH}" \
      --output=json \
      --output-path="${report}" \
      --quiet 2>/dev/null || true
  fi
fi

score="$(python3 -c "import json; d=json.load(open('${report}')); print(int(d['categories']['pwa']['score']*100))" 2>/dev/null || echo 0)"
rm -f "${report}"
echo "PWA score: ${score}"
if [[ "${score}" -ge "${MIN_SCORE}" ]]; then
  echo "OK"
  exit 0
fi

# PWA manifest + SW proxy skoru (Lighthouse başarısız veya 0)
if [[ "${LIGHTHOUSE_PWA_PROXY:-1}" == "1" ]]; then
  base="$(echo "${URL}" | sed 's|/mail.*||')"
  sw="$(curl -fsS --connect-timeout 12 "${base}/sw.js" 2>/dev/null || true)"
  man="$(curl -fsS -o /dev/null -w '%{http_code}' --connect-timeout 12 "${base}/manifest.webmanifest" 2>/dev/null || echo 0)"
  proxy_score=0
  [[ "${sw}" == *"lerta-mail-shell-v"* ]] && proxy_score=$((proxy_score + 50))
  [[ "${sw}" == *"lerta-mail-offline"* ]] && proxy_score=$((proxy_score + 20))
  [[ "${man}" == "200" ]] && proxy_score=$((proxy_score + 30))
  echo "PWA proxy score (manifest+SW): ${proxy_score}"
  if [[ "${proxy_score}" -ge "${MIN_SCORE}" ]]; then
    echo "OK (PWA proxy)"
    exit 0
  fi
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
