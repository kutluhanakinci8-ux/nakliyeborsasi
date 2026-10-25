#!/usr/bin/env bash
# Faz 6 UAT — önce kod (verify-uat-faz6-code-complete), sonra isteğe bağlı VPS runtime.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

ENV_FILE="${ENV_FILE:-${INSTALL_DIR:-${ROOT}}/.env}"
REPORT="${UAT_FAZ6_REPORT:-${ROOT}/docs/reports/UAT_FAZ6_SEQUENTIAL.json}"
STAMP="$(TZ=Europe/Istanbul date -Iseconds)"

m_code="SKIP"
m1="SKIP"
m2="SKIP"
m3="DEFERRED"
m4="DEFERRED"
m9="SKIP"
notes=()

echo "=== Faz 6 sıralı UAT (${STAMP}) ==="

echo ""
echo "—— Faz 6A: kod tamamlama ——"
if bash "${ROOT}/scripts/verify-uat-faz6-code-complete.sh"; then
  m_code="PASS"
  notes+=("Kod kapısı PASS — yapılandırma: OAuth, VAPID, PTR, inbox smoke")
else
  m_code="FAIL"
  notes+=("Kod kapısı FAIL — verify-uat-faz6-code-complete.sh")
  exit 1
fi

if [[ "${UAT_VPS_RUNTIME:-0}" != "1" ]]; then
  notes+=("VPS runtime atlandı — UAT_VPS_RUNTIME=1 ile M1/M2/M9 canlı")
else
  if [[ -f /etc/dovecot/conf.d/99-lerta-mail.conf ]] && [[ -x "${ROOT}/scripts/smoke-imap-gold.sh" ]]; then
    EMAIL="$(bash "${ROOT}/scripts/resolve-parity-imap-test-email.sh")"
    echo ""
    echo "—— M1 IMAP gold (${EMAIL}) ——"
    if [[ -x "${ROOT}/scripts/provision-pm5-imap-dovecot-vps.sh" ]]; then
      INSTALL_DIR="${INSTALL_DIR:-${ROOT}}" ENV_FILE="${ENV_FILE}" \
        bash "${ROOT}/scripts/provision-pm5-imap-dovecot-vps.sh" >/dev/null || true
    fi
    if INSTALL_DIR="${INSTALL_DIR:-${ROOT}}" ENV_FILE="${ENV_FILE}" PARITY_IMAP_TEST_EMAIL="${EMAIL}" \
      bash "${ROOT}/scripts/ensure-imap-gold-smoke-deploy.sh"; then
      m1="PASS_AUTO"
    else
      m1="FAIL"
    fi
  fi

  echo ""
  echo "—— M2 Outlook mobil (runtime) ——"
  set +e
  rc_m2=0
  INSTALL_DIR="${INSTALL_DIR:-${ROOT}}" ENV_FILE="${ENV_FILE}" \
    bash "${ROOT}/scripts/verify-uat-m2-outlook-mobile-imap.sh" || rc_m2=$?
  set -e
  if [[ "${rc_m2}" -eq 0 ]]; then
    m2="PASS_SERVER"
  elif [[ "${rc_m2}" -eq 2 ]]; then
    m2="WARN_SERVER"
  else
    m2="FAIL"
  fi

  echo ""
  echo "—— M9 inbound P0 (runtime) ——"
  set +e
  MAIL_INBOUND_PTR_SOFT="${MAIL_INBOUND_PTR_SOFT:-1}" bash "${ROOT}/scripts/verify-lerta-mail-inbound-p0.sh"
  inbound_rc=$?
  set -e
  if [[ "${inbound_rc}" -eq 0 ]]; then
    m9="PASS_P0_DNS"
  else
    m9="FAIL_P0_DNS"
  fi
fi

if [[ "${UAT_DEFER_OAUTH:-1}" == "0" ]]; then
  echo ""
  echo "—— M3/M4 OAuth env ——"
  if bash "${ROOT}/scripts/verify-uat-oauth-env.sh"; then
    m3="PASS_ENV"
    m4="PASS_ENV"
  else
    m3="MISSING_ENV"
    m4="MISSING_ENV"
  fi
fi

export UAT_FAZ6_NOTES_JSON UAT_FAZ6_REPORT_PATH UAT_FAZ6_STAMP
export UAT_FAZ6_CODE UAT_FAZ6_M1 UAT_FAZ6_M2 UAT_FAZ6_M3 UAT_FAZ6_M4 UAT_FAZ6_M9
UAT_FAZ6_REPORT_PATH="${REPORT}"
UAT_FAZ6_STAMP="${STAMP}"
UAT_FAZ6_CODE="${m_code}"
UAT_FAZ6_M1="${m1}"
UAT_FAZ6_M2="${m2}"
UAT_FAZ6_M3="${m3}"
UAT_FAZ6_M4="${m4}"
UAT_FAZ6_M9="${m9}"
UAT_FAZ6_NOTES_JSON="$(printf '%s\n' "${notes[@]}" | python3 -c 'import json,sys; print(json.dumps([l for l in sys.stdin.read().splitlines() if l]))')"
python3 - <<'PY'
import json
import os
from pathlib import Path

p = Path(os.environ["UAT_FAZ6_REPORT_PATH"])
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text(
    json.dumps(
        {
            "generatedAt": os.environ["UAT_FAZ6_STAMP"],
            "timezone": "Europe/Istanbul",
            "steps": {
                "code_complete": os.environ["UAT_FAZ6_CODE"],
                "M1_imap_gold": os.environ["UAT_FAZ6_M1"],
                "M2_outlook_mobile_imap": os.environ["UAT_FAZ6_M2"],
                "M3_graph_oauth_env": os.environ["UAT_FAZ6_M3"],
                "M4_google_calendar_env": os.environ["UAT_FAZ6_M4"],
                "M9_inbound_p0": os.environ["UAT_FAZ6_M9"],
            },
            "notes": json.loads(os.environ["UAT_FAZ6_NOTES_JSON"]),
        },
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)
print(f"Wrote {p}")
PY

echo ""
echo "=== Özet: kod=${m_code} M1=${m1} M2=${m2} M3=${m3} M4=${m4} M9=${m9} ==="
if [[ "${m1}" == FAIL ]] || [[ "${m2}" == FAIL ]]; then
  exit 1
fi
exit 0
