#!/usr/bin/env bash
# MP-8: app hub manifest + messaging SW + (opsiyonel) Lighthouse PWA ≥85.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_URL="${MESSAGING_HUB_ORIGIN:-https://app.lerta.com.tr}"

echo "== MP-8 messaging hub PWA verify =="

manifest_code="$(curl -sS -o /tmp/lerta-hub-manifest.json -w '%{http_code}' \
  --connect-timeout 12 "${APP_URL}/manifest.webmanifest" || echo 000)"
if [[ "${manifest_code}" != "200" ]]; then
  echo "FAIL: ${APP_URL}/manifest.webmanifest HTTP ${manifest_code}" >&2
  exit 1
fi
python3 -c "import json; d=json.load(open('/tmp/lerta-hub-manifest.json')); assert d.get('start_url','').find('messaging')>=0 or '/messaging' in d.get('start_url',''); assert d.get('display')=='standalone'; print('OK: hub manifest', d.get('short_name'))"

sw_body="$(curl -fsS --connect-timeout 12 "${APP_URL}/messaging-push-sw.js" 2>/dev/null || true)"
if [[ -z "${sw_body}" ]]; then
  echo "FAIL: ${APP_URL}/messaging-push-sw.js alınamadı" >&2
  exit 1
fi
if [[ "${sw_body}" != *"push"* ]]; then
  echo "FAIL: messaging-push-sw.js push handler eksik" >&2
  exit 1
fi
echo "OK: messaging-push-sw.js"

echo "== Posta PWA shell (kurumsal posta) =="
if [[ "${SKIP_POSTA_PWA:-}" == "1" ]]; then
  echo "SKIP: SKIP_POSTA_PWA=1"
else
  bash "${ROOT}/scripts/verify-mail-web-pwa-prod.sh"
fi

if [[ "${SKIP_LIGHTHOUSE:-1}" == "1" ]]; then
  echo "SKIP: SKIP_LIGHTHOUSE=1 (Lighthouse — geliştirme/CI: SKIP_LIGHTHOUSE=0)"
else
  LIGHTHOUSE_PWA_MIN="${LIGHTHOUSE_PWA_MIN:-85}" \
    bash "${ROOT}/scripts/verify-lighthouse-mail-pwa.sh" "${APP_URL}/login"
fi

echo "MP-8 messaging hub PWA verify: PASS"
