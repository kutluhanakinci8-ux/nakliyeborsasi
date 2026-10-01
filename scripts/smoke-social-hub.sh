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
if [[ -n "${SOCIAL_HUB_SMOKE_EXPECT_PHASE:-}" ]]; then
  echo "${status_json}" | grep -q "\"phase\":\"${SOCIAL_HUB_SMOKE_EXPECT_PHASE}\"" || {
    echo "FAIL: expected phase ${SOCIAL_HUB_SMOKE_EXPECT_PHASE}"
    echo "${status_json}"
    exit 1
  }
  echo "OK: phase ${SOCIAL_HUB_SMOKE_EXPECT_PHASE}"
fi
if [[ "${SOCIAL_HUB_SMOKE_WEBHOOK_READINESS:-0}" == "1" ]]; then
  echo "${status_json}" | grep -q '"integrationWebhookReadiness"' || {
    echo "FAIL: status missing integrationWebhookReadiness"
    exit 1
  }
  echo "OK: status integrationWebhookReadiness"
fi
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

if [[ -n "${SOCIAL_META_WEBHOOK_VERIFY_TOKEN:-}" ]]; then
  echo "== Meta webhook verify =="
  challenge="smoke-$(date +%s)"
  verify_code="$(curl -sS -o /tmp/social-hub-wh.json -w "%{http_code}" \
    "${API_BASE}/company/social-hub/webhooks/meta?hub.mode=subscribe&hub.verify_token=${SOCIAL_META_WEBHOOK_VERIFY_TOKEN}&hub.challenge=${challenge}")"
  if [[ "${verify_code}" != "200" ]]; then
    echo "FAIL: meta webhook verify HTTP ${verify_code}"
    exit 1
  fi
  if ! grep -q "${challenge}" /tmp/social-hub-wh.json 2>/dev/null; then
    body="$(cat /tmp/social-hub-wh.json 2>/dev/null || true)"
    if [[ "${body}" != "${challenge}" ]]; then
      echo "FAIL: challenge mismatch"
      exit 1
    fi
  fi
  echo "OK: meta webhook verify"
else
  echo "SKIP: SOCIAL_META_WEBHOOK_VERIFY_TOKEN yok"
fi

if [[ "${SOCIAL_HUB_SMOKE_TIKTOK_WEBHOOK:-1}" != "0" ]]; then
  echo "== TikTok webhook POST (skeleton) =="
  tt_code="$(curl -sS -o /tmp/social-hub-tt-wh.json -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"event":"smoke_ping"}' \
    "${API_BASE}/company/social-hub/webhooks/tiktok")"
  if [[ "${tt_code}" != "200" && "${tt_code}" != "201" ]]; then
    echo "FAIL: tiktok webhook HTTP ${tt_code}"
    cat /tmp/social-hub-tt-wh.json 2>/dev/null || true
    exit 1
  fi
  grep -q '"received":true' /tmp/social-hub-tt-wh.json || {
    echo "FAIL: tiktok webhook body"
    exit 1
  }
  echo "OK: tiktok webhook"
else
  echo "SKIP: SOCIAL_HUB_SMOKE_TIKTOK_WEBHOOK=0"
fi

if [[ "${SOCIAL_HUB_SMOKE_YOUTUBE_WEBHOOK:-1}" != "0" ]]; then
  yt_auth_args=()
  if [[ -n "${SOCIAL_YOUTUBE_WEBHOOK_SMOKE_TOKEN:-}" ]]; then
    yt_auth_args+=(-H "X-Social-Hub-YouTube-Token: ${SOCIAL_YOUTUBE_WEBHOOK_SMOKE_TOKEN}")
  fi
  echo "== YouTube webhook POST (skeleton) =="
  yt_code="$(curl -sS -o /tmp/social-hub-yt-wh.json -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    "${yt_auth_args[@]}" \
    -d '{"kind":"smoke_ping"}' \
    "${API_BASE}/company/social-hub/webhooks/youtube")"
  if [[ "${yt_code}" != "200" && "${yt_code}" != "201" ]]; then
    echo "FAIL: youtube webhook HTTP ${yt_code}"
    exit 1
  fi
  grep -q '"received":true' /tmp/social-hub-yt-wh.json || {
    echo "FAIL: youtube webhook body"
    exit 1
  }
  echo "OK: youtube webhook"
  echo "== YouTube webhook POST (Pub/Sub decode) =="
  yt_pubsub_b64="$(printf '%s' '{"channelId":"UCsmoke","text":"smoke_pubsub"}' | base64 -w0 2>/dev/null || printf '%s' '{"channelId":"UCsmoke","text":"smoke_pubsub"}' | base64)"
  yt_pubsub_code="$(curl -sS -o /tmp/social-hub-yt-pubsub.json -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    "${yt_auth_args[@]}" \
    -d "{\"message\":{\"data\":\"${yt_pubsub_b64}\"}}" \
    "${API_BASE}/company/social-hub/webhooks/youtube")"
  if [[ "${yt_pubsub_code}" != "200" && "${yt_pubsub_code}" != "201" ]]; then
    echo "FAIL: youtube pubsub webhook HTTP ${yt_pubsub_code}"
    exit 1
  fi
  grep -q '"received":true' /tmp/social-hub-yt-pubsub.json || {
    echo "FAIL: youtube pubsub webhook body"
    exit 1
  }
  echo "OK: youtube pubsub webhook"
else
  echo "SKIP: SOCIAL_HUB_SMOKE_YOUTUBE_WEBHOOK=0"
fi

echo "smoke-social-hub: PASS"
