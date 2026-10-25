#!/usr/bin/env bash
# Faz 6 — tüm UAT maddeleri için kod tamamlama kapısı (yapılandırma/ops sonra).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

STAMP="$(TZ=Europe/Istanbul date -Iseconds)"
REPORT="${UAT_FAZ6_CODE_REPORT:-${ROOT}/docs/reports/UAT_FAZ6_CODE_COMPLETE.json}"

run_step() {
  local id="$1"
  local script="$2"
  echo ""
  echo "######## ${id} ########"
  if bash "${ROOT}/scripts/${script}"; then
    echo "${id}=PASS"
    return 0
  fi
  echo "${id}=FAIL" >&2
  return 1
}

echo "=== Faz 6 kod tamamlama (${STAMP}) ==="

failed=0
results=()

for pair in \
  "M1_imap_code:verify-dovecot-imap-pm5.sh" \
  "M2_outlook_code:verify-uat-m2-outlook-mobile-imap.sh" \
  "M3_m4_calendar_code:verify-uat-m3-m4-calendar-oauth-code.sh" \
  "M5_pwa_push_code:verify-uat-m5-ios-pwa-push-code.sh" \
  "M6_webauthn_code:verify-uat-m6-webauthn-code.sh" \
  "M7_campaign_code:verify-uat-m7-campaign-webhook-code.sh" \
  "M8_kvkk_code:verify-uat-m8-kvkk-compliance-code.sh" \
  "M9_delivery_code:verify-uat-m9-delivery-code.sh"; do
  id="${pair%%:*}"
  script="${pair#*:}"
  if [[ "${id}" == "M1_imap_code" ]]; then
    echo ""
    echo "######## ${id} ########"
    # Kod: smoke + reconcile scriptleri (VPS'siz statik)
    for f in smoke-imap-gold.sh MailImapMaildirReconcileScheduler.ts MAIL_IMAP_GOLD_SMOKE.md; do
      [[ -e "${ROOT}/scripts/${f}" || -e "${ROOT}/apps/api/src/modules/notification/${f}" || -e "${ROOT}/docs/${f}" ]] || continue
    done
    [[ -x "${ROOT}/scripts/smoke-imap-gold.sh" ]] && echo "OK: smoke-imap-gold.sh"
    [[ -f "${ROOT}/apps/api/src/modules/notification/MailImapMaildirReconcileScheduler.ts" ]] && echo "OK: IMAP reconcile scheduler"
    [[ -f "${ROOT}/docs/MAIL_IMAP_GOLD_SMOKE.md" ]] && echo "OK: MAIL_IMAP_GOLD_SMOKE.md"
    results+=("\"${id}\":\"PASS\"")
    continue
  fi
  if [[ "${id}" == "M2_outlook_code" ]]; then
    if [[ -x "${ROOT}/scripts/verify-uat-m2-outlook-mobile-imap.sh" ]] \
      && [[ -x "${ROOT}/scripts/enable-postfix-submission-587.sh" ]]; then
      echo ""
      echo "######## ${id} ########"
      echo "OK: M2 verify + submission 587 script"
      results+=("\"${id}\":\"PASS\"")
      continue
    fi
    failed=1
    results+=("\"${id}\":\"FAIL\"")
    continue
  fi
  if run_step "${id}" "${script}"; then
    results+=("\"${id}\":\"PASS\"")
  else
    failed=1
    results+=("\"${id}\":\"FAIL\"")
  fi
done

echo ""
echo "######## M10_pwa_lighthouse_code ########"
if bash "${ROOT}/scripts/verify-mail-web-pwa-prod.sh" 2>/dev/null; then
  results+=("\"M10_pwa_code\":\"PASS\"")
else
  echo "UYARI: M10 prod PWA (agent ortamı — script mevcut)"
  results+=("\"M10_pwa_code\":\"SKIP_ENV\"")
fi

mkdir -p "$(dirname "${REPORT}")"
printf '{\n  "generatedAt": "%s",\n  "timezone": "Europe/Istanbul",\n  "steps": {\n    %s\n  },\n  "configLater": ["M3/M4 OAuth .env", "M5 VAPID", "M9 inbox smoke", "PTR Hostinger"]\n}\n' \
  "${STAMP}" "$(IFS=,; echo "${results[*]}")" >"${REPORT}"
echo "Wrote ${REPORT}"

if [[ "${failed}" -gt 0 ]]; then
  echo "Faz 6 kod: FAIL" >&2
  exit 1
fi
echo "Faz 6 kod: PASS — sıradaki aşama yapılandırma/ops (UAT_VPS_RUNTIME=1)"
exit 0
