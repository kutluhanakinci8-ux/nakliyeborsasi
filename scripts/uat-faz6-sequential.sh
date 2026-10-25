#!/usr/bin/env bash
# Faz 6 UAT — sıralı otomatik adımlar (M1 otomasyon, M3/M4 env, M9 inbound P0).
# Thunderbird/Graph sync/Gmail inbox teslimi (M1 görsel, M2–M5, M7–M9 gönderim) manuel kalır.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

ENV_FILE="${ENV_FILE:-${INSTALL_DIR:-${ROOT}}/.env}"
REPORT="${UAT_FAZ6_REPORT:-${ROOT}/docs/reports/UAT_FAZ6_SEQUENTIAL.json}"
STAMP="$(TZ=Europe/Istanbul date -Iseconds)"

m1="SKIP"
m3="SKIP"
m4="SKIP"
m9="SKIP"
notes=()

echo "=== Faz 6 sıralı UAT (${STAMP}) ==="

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
    notes+=("M1: Dovecot+IMAP LIST/INBOX OK; Thunderbird çift yön manuel — docs/MAIL_IMAP_GOLD_SMOKE.md")
  else
    m1="FAIL"
    notes+=("M1: smoke/rotate başarısız — aktif mailbox ve PM-5 maildir kontrol")
  fi
else
  notes+=("M1: Dovecot yok veya agent ortamı — VPS'te ensure-imap-gold-smoke-deploy.sh")
fi

echo ""
echo "—— M3/M4 OAuth env ——"
if bash "${ROOT}/scripts/verify-uat-oauth-env.sh"; then
  m3="PASS_ENV"
  m4="PASS_ENV"
else
  m3="MISSING_ENV"
  m4="MISSING_ENV"
  notes+=("M3/M4: VPS .env Graph + Google — MAIL_PRELAUNCH gate P0-1/P0-2")
fi

echo ""
echo "—— M9 inbound (P0 DNS/PTR) ——"
set +e
MAIL_INBOUND_PTR_SOFT="${MAIL_INBOUND_PTR_SOFT:-1}" bash "${ROOT}/scripts/verify-lerta-mail-inbound-p0.sh"
inbound_rc=$?
set -e
if [[ "${inbound_rc}" -eq 0 ]]; then
  m9="PASS_P0_DNS"
  notes+=("M9: MSN/Gmail/Outlook inbox teslimi manuel — EMAIL_PILOT §3.3")
else
  m9="FAIL_P0_DNS"
  notes+=("M9: inbound P0 FAIL (ör. :25 dinleyici / PTR) — verify-lerta-mail-inbound-p0.sh")
fi

echo ""
echo "—— M6/M10 preflight ——"
bash "${ROOT}/scripts/uat-premium-preflight.sh" 2>/dev/null | grep '^MANUAL:' || true

export UAT_FAZ6_NOTES_JSON UAT_FAZ6_REPORT_PATH UAT_FAZ6_STAMP UAT_FAZ6_M1 UAT_FAZ6_M3 UAT_FAZ6_M4 UAT_FAZ6_M9
UAT_FAZ6_REPORT_PATH="${REPORT}"
UAT_FAZ6_STAMP="${STAMP}"
UAT_FAZ6_M1="${m1}"
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
                "M1_imap_gold": os.environ["UAT_FAZ6_M1"],
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
echo "=== Faz 6 sıralı özet: M1=${m1} M3=${m3} M4=${m4} M9=${m9} ==="
if [[ "${m1}" == FAIL ]] || [[ "${m9}" == FAIL_* ]]; then
  exit 1
fi
exit 0
