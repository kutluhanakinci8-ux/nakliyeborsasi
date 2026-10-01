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
  if [[ "${SOCIAL_HUB_SMOKE_EXPECT_PHASE}" == "ao" ]]; then
    echo "${status_json}" | grep -q '"analytics_meta_platform_insights"' || {
      echo "FAIL: status missing analytics_meta_platform_insights feature"
      exit 1
    }
    echo "OK: status analytics_meta_platform_insights feature"
  fi
  if [[ "${SOCIAL_HUB_SMOKE_EXPECT_PHASE}" == "ap" ]]; then
    echo "${status_json}" | grep -q '"analytics_linkedin_org_insights"' || {
      echo "FAIL: status missing analytics_linkedin_org_insights feature"
      exit 1
    }
    echo "OK: status analytics_linkedin_org_insights feature"
  fi
  if [[ "${SOCIAL_HUB_SMOKE_EXPECT_PHASE}" == "aq" ]]; then
    echo "${status_json}" | grep -q '"inbox_threads_preview_panel"' || {
      echo "FAIL: status missing inbox_threads_preview_panel feature"
      exit 1
    }
    echo "OK: status inbox_threads_preview_panel feature"
  fi
  if [[ "${SOCIAL_HUB_SMOKE_EXPECT_PHASE}" == "ar" ]]; then
    echo "${status_json}" | grep -q '"inbox_sync_summary_by_platform"' || {
      echo "FAIL: status missing inbox_sync_summary_by_platform feature"
      exit 1
    }
    echo "OK: status inbox_sync_summary_by_platform feature"
  fi
  if [[ "${SOCIAL_HUB_SMOKE_EXPECT_PHASE}" == "as" ]]; then
    echo "${status_json}" | grep -q '"publishing_media_upload_graph"' || {
      echo "FAIL: status missing publishing_media_upload_graph feature"
      exit 1
    }
    echo "OK: status publishing_media_upload_graph feature"
  fi
  if [[ "${SOCIAL_HUB_SMOKE_EXPECT_PHASE}" == "at" ]]; then
    echo "${status_json}" | grep -q '"publishing_calendar_grid"' || {
      echo "FAIL: status missing publishing_calendar_grid feature"
      exit 1
    }
    echo "OK: status publishing_calendar_grid feature"
  fi
  if [[ "${SOCIAL_HUB_SMOKE_EXPECT_PHASE}" == "au" ]]; then
    echo "${status_json}" | grep -q '"templates_variables_render_preview"' || {
      echo "FAIL: status missing templates_variables_render_preview feature"
      exit 1
    }
    echo "OK: status templates_variables_render_preview feature"
  fi
  if [[ "${SOCIAL_HUB_SMOKE_EXPECT_PHASE}" == "av" ]]; then
    echo "${status_json}" | grep -q '"tiktok_prod_provider_path"' || {
      echo "FAIL: status missing tiktok_prod_provider_path feature"
      exit 1
    }
    echo "OK: status tiktok_prod_provider_path feature"
  fi
fi
if [[ "${SOCIAL_HUB_SMOKE_WEBHOOK_READINESS:-0}" == "1" ]]; then
  echo "${status_json}" | grep -q '"integrationWebhookReadiness"' || {
    echo "FAIL: status missing integrationWebhookReadiness"
    exit 1
  }
  echo "${status_json}" | grep -q '"integrationWebhooks"' || {
    echo "FAIL: status missing integrationWebhooks"
    exit 1
  }
  echo "OK: status integrationWebhookReadiness"
  echo "OK: status integrationWebhooks"
  echo "${status_json}" | grep -q '"integrationOpsHints"' || {
    echo "FAIL: status missing integrationOpsHints"
    exit 1
  }
  echo "OK: status integrationOpsHints"
  echo "${status_json}" | grep -q '"webhookBridge24h"' || {
    echo "FAIL: status missing webhookBridge24h"
    exit 1
  }
  echo "${status_json}" | grep -q '"companiesActive24h"' || {
    echo "FAIL: status webhookBridge24h missing companiesActive24h"
    exit 1
  }
  echo "${status_json}" | grep -q '"webhookBridge7d"' || {
    echo "FAIL: status missing webhookBridge7d"
    exit 1
  }
  echo "OK: status webhookBridge24h"
  echo "OK: status webhookBridge7d"
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
  if [[ "${SOCIAL_HUB_SMOKE_WEBHOOK_ACTIVITY:-0}" == "1" ]]; then
    grep -q '"webhookActivity"' /tmp/social-hub-snap.json || {
      echo "FAIL: snapshot missing webhookActivity"
      exit 1
    }
    echo "OK: snapshot webhookActivity"
  fi
  if [[ "${SOCIAL_HUB_SMOKE_POSTS_RANGE:-0}" == "1" ]]; then
    range_from="$(date -u -d '1 day ago' +%Y-%m-%dT00:00:00.000Z 2>/dev/null || date -u -v-1d +%Y-%m-%dT00:00:00.000Z)"
    range_to="$(date -u -d '+60 days' +%Y-%m-%dT23:59:59.999Z 2>/dev/null || date -u -v+60d +%Y-%m-%dT23:59:59.999Z)"
    posts_code="$(curl -sS -o /tmp/social-hub-posts.json -w "%{http_code}" \
      -H "Authorization: Bearer ${SOCIAL_HUB_JWT}" \
      "${API_BASE}/company/social-hub/posts?from=${range_from}&to=${range_to}")"
    if [[ "${posts_code}" != "200" ]]; then
      echo "FAIL: posts range HTTP ${posts_code}"
      exit 1
    fi
    grep -q '"posts"' /tmp/social-hub-posts.json || {
      echo "FAIL: posts range missing posts array"
      exit 1
    }
    echo "OK: posts range query"
  fi
  if [[ "${SOCIAL_HUB_SMOKE_INBOX_SYNC_SUMMARY:-0}" == "1" ]]; then
    sync_code="$(curl -sS -o /tmp/social-hub-inbox-sync.json -w "%{http_code}" \
      -H "Authorization: Bearer ${SOCIAL_HUB_JWT}" \
      "${API_BASE}/company/social-hub/inbox/sync-summary")"
    if [[ "${sync_code}" != "200" ]]; then
      echo "FAIL: inbox sync-summary HTTP ${sync_code}"
      exit 1
    fi
    grep -q '"channels"' /tmp/social-hub-inbox-sync.json || {
      echo "FAIL: inbox sync-summary missing channels"
      exit 1
    }
    echo "OK: inbox sync-summary"
  fi
  if [[ "${SOCIAL_HUB_SMOKE_INBOX_PREVIEW:-0}" == "1" ]]; then
    preview_code="$(curl -sS -o /tmp/social-hub-inbox-preview.json -w "%{http_code}" \
      -H "Authorization: Bearer ${SOCIAL_HUB_JWT}" \
      "${API_BASE}/company/social-hub/inbox/threads-preview?limit=10")"
    if [[ "${preview_code}" != "200" ]]; then
      echo "FAIL: inbox threads-preview HTTP ${preview_code}"
      exit 1
    fi
    grep -q '"threads"' /tmp/social-hub-inbox-preview.json || {
      echo "FAIL: inbox preview missing threads"
      exit 1
    }
    echo "OK: inbox threads-preview"
  fi
  if [[ "${SOCIAL_HUB_SMOKE_TEMPLATES:-0}" == "1" ]]; then
    vars_code="$(curl -sS -o /tmp/social-hub-template-vars.json -w "%{http_code}" \
      -H "Authorization: Bearer ${SOCIAL_HUB_JWT}" \
      "${API_BASE}/company/social-hub/templates/variables")"
    if [[ "${vars_code}" != "200" ]]; then
      echo "FAIL: templates/variables HTTP ${vars_code}"
      exit 1
    fi
    grep -q '"variables"' /tmp/social-hub-template-vars.json || {
      echo "FAIL: templates/variables missing variables array"
      exit 1
    }
    preview_code="$(curl -sS -o /tmp/social-hub-template-preview.json -w "%{http_code}" \
      -H "Authorization: Bearer ${SOCIAL_HUB_JWT}" \
      -H "Content-Type: application/json" \
      -d '{"bodyText":"Merhaba {{companyName}} — {{today}}"}' \
      "${API_BASE}/company/social-hub/templates/preview")"
    if [[ "${preview_code}" != "200" ]]; then
      echo "FAIL: templates/preview HTTP ${preview_code}"
      exit 1
    fi
    grep -q '"renderedText"' /tmp/social-hub-template-preview.json || {
      echo "FAIL: templates/preview missing renderedText"
      exit 1
    }
    echo "OK: templates variables + preview"
  fi
  if [[ "${SOCIAL_HUB_SMOKE_PLATFORM_INSIGHTS:-0}" == "1" ]]; then
    analytics_code="$(curl -sS -o /tmp/social-hub-analytics.json -w "%{http_code}" \
      -H "Authorization: Bearer ${SOCIAL_HUB_JWT}" \
      "${API_BASE}/company/social-hub/analytics")"
    if [[ "${analytics_code}" != "200" ]]; then
      echo "FAIL: analytics HTTP ${analytics_code}"
      exit 1
    fi
    grep -q '"platformInsights"' /tmp/social-hub-analytics.json || {
      echo "FAIL: analytics missing platformInsights"
      exit 1
    }
    echo "OK: analytics platformInsights"
  fi
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

if [[ "${SOCIAL_HUB_SMOKE_TIKTOK_SIGNATURE:-0}" == "1" && -n "${SOCIAL_TIKTOK_WEBHOOK_SECRET:-}" ]]; then
  echo "== TikTok webhook signature contract =="
  tt_body='{"event":"sig_smoke"}'
  tt_sig="$(printf '%s' "${tt_body}" | openssl dgst -sha256 -hmac "${SOCIAL_TIKTOK_WEBHOOK_SECRET}" | awk '{print $2}')"
  tt_bad_code="$(curl -sS -o /tmp/social-hub-tt-bad.json -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "${tt_body}" \
    "${API_BASE}/company/social-hub/webhooks/tiktok")"
  if [[ "${SOCIAL_HUB_SMOKE_TIKTOK_SIGNATURE_REQUIRED:-0}" == "1" ]]; then
    if [[ "${tt_bad_code}" == "200" || "${tt_bad_code}" == "201" ]]; then
      echo "FAIL: expected non-2xx for unsigned tiktok webhook when signature required"
      exit 1
    fi
    echo "OK: unsigned tiktok webhook rejected (HTTP ${tt_bad_code})"
  fi
  tt_good_code="$(curl -sS -o /tmp/social-hub-tt-good.json -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-tiktok-signature: sha256=${tt_sig}" \
    -d "${tt_body}" \
    "${API_BASE}/company/social-hub/webhooks/tiktok")"
  if [[ "${tt_good_code}" != "200" && "${tt_good_code}" != "201" ]]; then
    echo "FAIL: signed tiktok webhook HTTP ${tt_good_code}"
    exit 1
  fi
  echo "OK: signed tiktok webhook"
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
