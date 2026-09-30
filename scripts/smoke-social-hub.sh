#!/usr/bin/env bash
# Prod/staging: sosyal hub modül durumu + (opsiyonel) JWT ile snapshot.
set -euo pipefail

API_BASE="${SOCIAL_HUB_API_BASE:-https://app.lerta.com.tr/api/v1}"
WEB_BASE="${SOCIAL_HUB_WEB_PUBLIC_URL:-https://app.lerta.com.tr}"

echo "== Social hub public status =="
status_json="$(curl -fsS "${API_BASE}/company/social-hub/status")"
echo "${status_json}" | grep -q '"module":"social_hub"' || {
  echo "FAIL: unexpected status payload"
  exit 1
}
echo "OK: status endpoint"

echo "== Social hub web route =="
code="$(curl -sS -o /dev/null -w "%{http_code}" "${WEB_BASE}/hesap/sosyal-medya")"
if [[ "${code}" != "200" && "${code}" != "307" && "${code}" != "308" ]]; then
  echo "FAIL: /hesap/sosyal-medya HTTP ${code}"
  exit 1
fi
echo "OK: web route HTTP ${code}"

if [[ -n "${SOCIAL_HUB_JWT:-}" ]]; then
  echo "== Authenticated snapshot =="
  snap_code="$(curl -sS -o /tmp/social-hub-snap.json -w "%{http_code}" \
    -H "Authorization: Bearer ${SOCIAL_HUB_JWT}" \
    "${API_BASE}/company/social-hub")"
  if [[ "${snap_code}" != "200" ]]; then
    echo "FAIL: snapshot HTTP ${snap_code}"
    cat /tmp/social-hub-snap.json 2>/dev/null || true
    exit 1
  fi
  grep -q '"hub"' /tmp/social-hub-snap.json || grep -q '"subscription"' /tmp/social-hub-snap.json || {
    echo "FAIL: snapshot body"
    exit 1
  }
  echo "OK: snapshot"
else
  echo "SKIP: SOCIAL_HUB_JWT yok — authenticated snapshot"
fi

echo "smoke-social-hub: PASS"
