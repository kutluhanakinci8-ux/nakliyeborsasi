#!/usr/bin/env bash
# Faz 9 — otomasyon + müşteri imza raporu (manuel maddeler PENDING_SIGNATURE).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DAY="$(TZ=Europe/Istanbul date +%Y-%m-%d)"
STAMP="$(TZ=Europe/Istanbul date -Iseconds)"
ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
if [[ ! -f "${ENV_FILE}" && -f "${ROOT}/.env" ]]; then
  ENV_FILE="${ROOT}/.env"
fi
REPORT_JSON="${ROOT}/docs/reports/UAT_FAZ9_SIGNOFF_${DAY}.json"
REPORT_MD="${ROOT}/docs/reports/UAT_FAZ9_SIGNOFF_${DAY}.md"
mkdir -p "${ROOT}/docs/reports"

m_faz6="SKIP"
m_imap_auto="SKIP"
m_inbound="SKIP"
m_calendar_env="MISSING"
m_thunderbird="PENDING_SIGNATURE"
m_apple_mail="PENDING_SIGNATURE"
m_delivery_inbox="PENDING_SIGNATURE"
m_calendar_live="PENDING_SIGNATURE"

echo "== Faz 9 müşteri UAT (${STAMP}) =="

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi
export ENV_FILE INSTALL_DIR="${INSTALL_DIR:-${ROOT}}"

echo ""
echo "—— 1/4 Faz 6 sıralı (runtime) ——"
if UAT_VPS_RUNTIME=1 UAT_DEFER_OAUTH=1 bash "${ROOT}/scripts/uat-faz6-sequential.sh"; then
  m_faz6="PASS"
fi

echo ""
echo "—— 2/4 IMAP gold (Thunderbird öncesi) ——"
EMAIL="$(bash "${ROOT}/scripts/resolve-parity-imap-test-email.sh")"
if INSTALL_DIR="${INSTALL_DIR}" ENV_FILE="${ENV_FILE}" \
  bash "${ROOT}/scripts/smoke-imap-gold.sh" "${EMAIL}"; then
  m_imap_auto="PASS"
else
  echo "UYARI: IMAP gold otomasyon FAIL — M1-TB manuel zorunlu"
fi

echo ""
echo "—— 3/4 Inbound P0 (M9 altyapı) ——"
if MAIL_INBOUND_PTR_SOFT="${MAIL_INBOUND_PTR_SOFT:-1}" \
  bash "${ROOT}/scripts/verify-lerta-mail-inbound-p0.sh"; then
  m_inbound="PASS"
fi

echo ""
echo "—— 4/4 Google Calendar env (M4) ——"
if grep -qE '^GOOGLE_CALENDAR_CLIENT_ID=.+$' "${ENV_FILE}" 2>/dev/null \
  && grep -qE '^GOOGLE_CALENDAR_CLIENT_SECRET=.+$' "${ENV_FILE}" 2>/dev/null; then
  m_calendar_env="PASS"
  m_calendar_live="PENDING_SIGNATURE"
else
  m_calendar_env="OPTIONAL_MISSING"
  m_calendar_live="N/A"
fi

if [[ "${UAT_M9_DELIVERY_SIGNED:-0}" == "1" ]]; then
  m_delivery_inbox="SIGNED"
fi
if [[ "${UAT_M1_THUNDERBIRD_SIGNED:-0}" == "1" ]]; then
  m_thunderbird="SIGNED"
fi
if [[ "${UAT_M1_APPLE_SIGNED:-0}" == "1" ]]; then
  m_apple_mail="SIGNED"
fi

python3 - <<PY
import json
from pathlib import Path

payload = {
    "generatedAt": "${STAMP}",
    "timezone": "Europe/Istanbul",
    "automation": {
        "faz6_sequential_runtime": "${m_faz6}",
        "imap_gold_smoke": "${m_imap_auto}",
        "inbound_p0": "${m_inbound}",
        "google_calendar_env": "${m_calendar_env}",
    },
    "customer_signoff": {
        "M1_thunderbird": "${m_thunderbird}",
        "M1_apple_mail": "${m_apple_mail}",
        "M9_delivery_inbox": "${m_delivery_inbox}",
        "M4_google_calendar_live": "${m_calendar_live}",
    },
    "runbook": "docs/UAT_FAZ9_CUSTOMER_SIGNOFF.md",
    "notes": [
        "Otomasyon PASS ≠ müşteri imzası; imza için UAT_*_SIGNED=1 veya imzalı PDF.",
        "Pilot teslimat: docs/EMAIL_PILOT_LERTA_COM_TR.md",
    ],
}
Path("${REPORT_JSON}").write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY

cat > "${REPORT_MD}" <<EOF
# UAT Faz 9 — imza raporu (${DAY})

**Oluşturulma:** ${STAMP} (Europe/Istanbul)

## Otomasyon

| Kontrol | Durum |
|---------|--------|
| Faz 6 runtime | ${m_faz6} |
| IMAP gold smoke (${EMAIL}) | ${m_imap_auto} |
| Inbound P0 | ${m_inbound} |
| Google Calendar .env | ${m_calendar_env} |

## Müşteri imzası bekleniyor

| Madde | Durum |
|-------|--------|
| M1 Thunderbird | ${m_thunderbird} |
| M1 Apple Mail | ${m_apple_mail} |
| M9 Teslimat kutusu | ${m_delivery_inbox} |
| M4 Google Takvim canlı | ${m_calendar_live} |

İmza şablonu: \`docs/UAT_FAZ9_CUSTOMER_SIGNOFF.md\`
EOF

echo "Wrote ${REPORT_JSON}"
echo "Wrote ${REPORT_MD}"

auto_ok=1
[[ "${m_faz6}" != "PASS" ]] && auto_ok=0
[[ "${m_imap_auto}" != "PASS" ]] && auto_ok=0
[[ "${m_inbound}" != "PASS" ]] && auto_ok=0

if [[ "${auto_ok}" -eq 0 ]]; then
  echo "run-faz9-uat-signoff-sequence: FAIL (otomasyon)" >&2
  exit 1
fi

pending=0
for k in "${m_thunderbird}" "${m_apple_mail}" "${m_delivery_inbox}"; do
  [[ "${k}" == PENDING_SIGNATURE ]] && pending=1
done
if [[ "${pending}" -eq 1 ]]; then
  echo "run-faz9-uat-signoff-sequence: PASS_AUTO (müşteri imzası bekleniyor — ${pending} madde)"
  exit 0
fi
echo "run-faz9-uat-signoff-sequence: PASS_FULL"
exit 0
