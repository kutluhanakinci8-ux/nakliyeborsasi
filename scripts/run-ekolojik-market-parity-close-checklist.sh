#!/usr/bin/env bash
# EK-U4: Ekolojik Market iletişim paritesi kapanış — public smoke + rubrik (VPS tam kapı opsiyonel).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE="${EKOLOJIK_API_BASE:-${SOCIAL_HUB_API_BASE:-http://127.0.0.1:3000/api/v1}}"
ROADMAP="${ROOT}/docs/EKOLojIK_MARKET_PARITY_ROADMAP.md"
MAIL_MIN="${EK_U4_MAIL_MIN_PERCENT:-95}"
MSG_MIN="${EK_U4_MESSAGING_MIN_PERCENT:-95}"
FAIL=0

run_step() {
  local title="$1"
  shift
  echo ""
  echo "== ${title} =="
  if "$@"; then
    echo "OK"
  else
    echo "NOT: ${title}" >&2
    FAIL=1
  fi
}

echo "== Ekolojik Market parity close checklist (EK-U4) =="

run_step "Status source (EK-OPS)" \
  bash "${ROOT}/scripts/verify-ekolojik-market-status-source.sh"

run_step "Parity roadmap" test -f "${ROADMAP}"
if [[ -f "${ROADMAP}" ]]; then
  grep -q "ek-u4" "${ROADMAP}" || {
    echo "FAIL: roadmap missing ek-u4" >&2
    FAIL=1
  }
fi

run_step "Public parity smoke (phase ek-u4)" \
  env EKOLOJIK_SMOKE_EXPECT_PHASE=ek-u4 \
  EKOLOJIK_API_BASE="${API_BASE}" \
  bash "${ROOT}/scripts/smoke-ekolojik-market-parity.sh"

echo ""
echo "== Posta P6–P11 hub features (status JSON) =="
if ! status_json="$(curl -fsS "${API_BASE}/public/ekolojik-market/status")"; then
  echo "FAIL: could not fetch ekolojik-market status for P6–P11 gate" >&2
  FAIL=1
else
  for feat in \
    ekolojik_mail_caldav_carddav_hub \
    ekolojik_mail_deliverability_dmarc_hub \
    ekolojik_mail_pwa_offline_push_hub \
    ekolojik_mail_ai_compose_hub \
    ekolojik_mail_engagement_webhook_analytics_hub \
    ekolojik_mail_ops_snapshot_runbook_hub; do
    echo "${status_json}" | grep -q "\"${feat}\"" || {
      echo "FAIL: missing feature ${feat}" >&2
      FAIL=1
    }
  done
  echo "${status_json}" | grep -q '"postaPhaseComplete":"ek-p11"' || {
    echo "FAIL: parityClose.postaPhaseComplete not ek-p11" >&2
    FAIL=1
  }
  if [[ "$FAIL" -eq 0 ]]; then
    echo "OK: posta P6–P11 features + postaPhaseComplete ek-p11"
  fi
fi

echo ""
echo "== Rubrik (public status) =="
if ! status_json="$(curl -fsS "${API_BASE}/public/ekolojik-market/status")"; then
  echo "FAIL: could not fetch ekolojik-market status" >&2
  exit 1
fi

echo "${status_json}" | grep -q '"ekolojik_parity_close_checklist"' || {
  echo "FAIL: missing ekolojik_parity_close_checklist feature" >&2
  FAIL=1
}
echo "OK: feature ekolojik_parity_close_checklist"

mail_pct="$(echo "${status_json}" | grep -o '"mailParityPercent":[0-9]*' | head -1 | cut -d: -f2)"
msg_pct="$(echo "${status_json}" | grep -o '"messagingParityPercent":[0-9]*' | head -1 | cut -d: -f2)"
if [[ -z "${mail_pct}" ]] || [[ -z "${msg_pct}" ]]; then
  echo "FAIL: parityClose rubric percents missing in status JSON" >&2
  FAIL=1
else
  if [[ "${mail_pct}" -ge "${MAIL_MIN}" ]]; then
    echo "OK: mail parity ${mail_pct}% (min ${MAIL_MIN}%)"
  else
    echo "FAIL: mail parity ${mail_pct}% < ${MAIL_MIN}%" >&2
    FAIL=1
  fi
  if [[ "${msg_pct}" -ge "${MSG_MIN}" ]]; then
    echo "OK: messaging parity ${msg_pct}% (min ${MSG_MIN}%)"
  else
    echo "FAIL: messaging parity ${msg_pct}% < ${MSG_MIN}%" >&2
    FAIL=1
  fi
fi

echo "${status_json}" | grep -q '"socialHubBcChecklistMet":true' || {
  echo "FAIL: socialHubBcChecklistMet not true" >&2
  FAIL=1
}
echo "OK: social hub BC integration gate rubric"

echo "${status_json}" | grep -q '"social_hub_integration_gate_checklist"' || {
  echo "FAIL: missing NB social_hub_integration_gate_checklist ref" >&2
  FAIL=1
}
echo "OK: NB BC checklist feature ref"

if [[ "${EK_U4_FULL:-0}" == "1" ]]; then
  echo ""
  echo "== EK-U4 full: shared NB mail/messaging parity close (VPS) =="
  run_step "run-mail-messaging-parity-close-checklist.sh" \
    bash "${ROOT}/scripts/run-mail-messaging-parity-close-checklist.sh"
else
  echo ""
  echo "SKIP: EK_U4_FULL=0 — NB mail/messaging VPS close atlandı (tam kapı: EK_U4_FULL=1)"
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "run-ekolojik-market-parity-close-checklist: PASS"
  exit 0
fi
echo "run-ekolojik-market-parity-close-checklist: FAIL — ${ROADMAP}" >&2
exit 1
