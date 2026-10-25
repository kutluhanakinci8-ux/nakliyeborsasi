#!/usr/bin/env bash
# Kurumsal SDLC test kataloğu — otomatik katmanların tamamı (VPS veya CI).
# Çıktı: docs/reports/SDLC_TEST_CATALOG_<date>.json + .md
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DAY="$(TZ=Europe/Istanbul date +%Y-%m-%d)"
REPORT_JSON="${ROOT}/docs/reports/SDLC_TEST_CATALOG_${DAY}.json"
REPORT_MD="${ROOT}/docs/reports/SDLC_TEST_CATALOG_${DAY}.md"
mkdir -p "${ROOT}/docs/reports"

declare -A S
fail=0

step() {
  local key="$1"
  local title="$2"
  shift 2
  echo ""
  echo "======== ${title} ========"
  if "$@"; then
    S["$key"]="PASS"
    echo "→ PASS"
  else
    S["$key"]="FAIL"
    fail=$((fail + 1))
    echo "→ FAIL" >&2
  fi
}

ENV_FILE="${ENV_FILE:-}"
[[ -z "${ENV_FILE}" && -f /var/www/nakliyeborsasi/.env ]] && ENV_FILE=/var/www/nakliyeborsasi/.env
[[ -z "${ENV_FILE}" && -f "${ROOT}/.env" ]] && ENV_FILE="${ROOT}/.env"
export ENV_FILE
export MAIL_INBOUND_PTR_SOFT="${MAIL_INBOUND_PTR_SOFT:-1}"
export MAIL_BILLING_PILOT_FREE="${MAIL_BILLING_PILOT_FREE:-1}"
export NPM_AUDIT_ALLOW_NEXT_CRITICAL="${NPM_AUDIT_ALLOW_NEXT_CRITICAL:-1}"
export UAT_VPS_RUNTIME="${UAT_VPS_RUNTIME:-1}"
export QA_CLOSURE_STRICT="${QA_CLOSURE_STRICT:-1}"

echo "== SDLC tam katalog ${DAY} (Europe/Istanbul) =="
echo "ENV_FILE=${ENV_FILE:-<none>} UAT_VPS_RUNTIME=${UAT_VPS_RUNTIME} QA_CLOSURE_STRICT=${QA_CLOSURE_STRICT}"

step functional_premium "A. Fonksiyonel — Unit/Integration/Regression/System/L10n/UAT-kod/Pentest-smoke" \
  bash "${ROOT}/scripts/run-lerta-premium-qa-suite.sh"

step performance_k6 "B. Performans — k6/autocannon profil" \
  bash "${ROOT}/scripts/qa-k6-profile.sh"

step security_faz7 "C. Güvenlik — Faz 7 (OWASP + ZAP passive)" \
  bash "${ROOT}/scripts/run-faz7-pentest-sequence.sh"

step compliance_faz8 "D. Uyumluluk — Faz 8 (MP-9 + 29119 kanıt)" \
  bash "${ROOT}/scripts/run-faz8-compliance-sequence.sh"

step uat_faz9 "E. UAT — Faz 9 otomasyon" \
  bash "${ROOT}/scripts/run-faz9-uat-signoff-sequence.sh"

step uat_faz9b "F. UAT — Faz 9b imza öncesi paket" \
  bash "${ROOT}/scripts/run-faz9b-pre-signoff-assist.sh"

step closure "G. Final kapı (STRICT müşteri-ready dahil)" \
  bash "${ROOT}/scripts/run-qa-gap-closure-final.sh"

echo ""
echo "======== H. Harici / müşteri durumu (bilgi) ========"
bash "${ROOT}/scripts/run-external-pending-status.sh" || true
S["external_status"]="INFO"

{
  echo "{"
  echo "  \"generatedAt\": \"$(TZ=Europe/Istanbul date -Iseconds)\","
  echo "  \"timezone\": \"Europe/Istanbul\","
  echo "  \"failCount\": ${fail},"
  echo "  \"categories\": {"
  first=1
  for k in functional_premium performance_k6 security_faz7 compliance_faz8 uat_faz9 uat_faz9b closure external_status; do
    [[ $first -eq 1 ]] || echo ","
    first=0
    printf '    "%s": "%s"' "$k" "${S[$k]:-UNKNOWN}"
  done
  echo ""
  echo "  },"
  echo "  \"traceability\": \"docs/ISO_29119_TEST_TRACEABILITY.md\","
  echo "  \"master_report\": \"docs/reports/LERTA_QA_MASTER_REPORT_${DAY}.json\""
  echo "}"
} > "${REPORT_JSON}"

cat > "${REPORT_MD}" <<EOF
# SDLC test kataloğu — tam koşu (${DAY})

**Komut:** \`npm run qa:full-catalog\`  
**JSON:** [SDLC_TEST_CATALOG_${DAY}.json](./SDLC_TEST_CATALOG_${DAY}.json)

## Kurumsal test türü → sonuç

| Test türü | Kapsam | Otomasyon | Bu koşu |
|-----------|--------|-----------|---------|
| Birim (Unit) | core + API vitest | Premium suite A | ${S[functional_premium]:-?} |
| Entegrasyon | health/ready + spec | Premium suite A | ${S[functional_premium]:-?} |
| Sistem | prod smoke + Playwright | Premium suite A | ${S[functional_premium]:-?} |
| Regresyon | parity close/wave-2 | Premium suite A | ${S[functional_premium]:-?} |
| Yük / stres | load + stress + k6 | A + B | ${S[functional_premium]:-?} / ${S[performance_k6]:-?} |
| Güvenlik | OWASP + ZAP passive | C | ${S[security_faz7]:-?} |
| UAT | Faz 6 ops + 9 imza otomasyon | A + E + F | ${S[uat_faz9]:-?} |
| Uyumluluk | MP-9 / 29119 kanıt | D | ${S[compliance_faz8]:-?} |
| Lokalizasyon | tr/en/expanded/i18n gate | Premium suite A | ${S[functional_premium]:-?} |
| Final kapı | STRICT customer-ready | G | ${S[closure]:-?} |

## Otomasyon dışı (bilgi)

- **9c** müşteri imzası (Thunderbird, Apple Mail, M9)
- **7b** sertifikalı pentest (kara/gri/beyaz kutu)
- **8b** SOC2 Type II / ISO 27001 / PCI-HIPAA kapsam denetimi
- **M4** Google Calendar OAuth (isteğe bağlı)

\`npm run qa:external-status\`

EOF

echo ""
echo "Wrote ${REPORT_JSON}"
echo "Wrote ${REPORT_MD}"
if [[ "${fail}" -gt 0 ]]; then
  echo "run-full-sdlc-test-catalog: FAIL (${fail})" >&2
  exit 1
fi
echo "run-full-sdlc-test-catalog: PASS"
exit 0
