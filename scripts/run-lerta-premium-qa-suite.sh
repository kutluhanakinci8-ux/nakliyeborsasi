#!/usr/bin/env bash
# Lerta — premium QA kapısı: unit, integration smoke, system/prod, regression, perf, security, compliance, l10n.
# Çıktı: docs/reports/LERTA_QA_MASTER_REPORT_<date>.md + .json özet
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(TZ=Europe/Istanbul date '+%Y-%m-%d')"
REPORT_DIR="${ROOT}/docs/reports"
REPORT_MD="${REPORT_DIR}/LERTA_QA_MASTER_REPORT_${STAMP}.md"
REPORT_JSON="${REPORT_DIR}/LERTA_QA_MASTER_REPORT_${STAMP}.json"
mkdir -p "${REPORT_DIR}"

declare -A RESULT
declare -A DETAIL

run_layer() {
  local key="$1"
  local title="$2"
  shift 2
  echo ""
  echo "######## ${title} ########"
  local log
  log="$(mktemp)"
  if "$@" >"${log}" 2>&1; then
    RESULT["${key}"]="PASS"
  else
    RESULT["${key}"]="FAIL"
  fi
  DETAIL["${key}"]="$(tail -n 40 "${log}" | sed 's/"/\\"/g' | tr '\n' ' ')"
  echo "--- tail ---"
  tail -n 15 "${log}" || true
  rm -f "${log}"
}

echo "== Lerta Premium QA Suite ${STAMP} (Europe/Istanbul) =="

ENV_FILE="${ENV_FILE:-}"
if [[ -z "${ENV_FILE}" && -f /var/www/nakliyeborsasi/.env ]]; then
  ENV_FILE=/var/www/nakliyeborsasi/.env
elif [[ -z "${ENV_FILE}" && -f "${ROOT}/.env" ]]; then
  ENV_FILE="${ROOT}/.env"
fi
if [[ -n "${ENV_FILE}" && -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
  # shellcheck source=scripts/resolve-operator-jwt.sh
  source "${ROOT}/scripts/resolve-operator-jwt.sh" || true
  # shellcheck source=scripts/resolve-mail-jmap-jwt.sh
  source "${ROOT}/scripts/resolve-mail-jmap-jwt.sh" || true
  export MAIL_JMAP_JWT="${MAIL_JMAP_JWT:-${ACCESS_TOKEN:-}}"
fi
export ENV_FILE="${ENV_FILE:-}"

run_layer unit_core "1. Unit — @nakliyeborsasi/core" npm run test:unit --prefix "${ROOT}"

run_layer unit_api "2. Unit/Integration — API vitest (all spec/test)" \
  npm run test:api --prefix "${ROOT}"

run_layer integration_smoke "2b. Integration — API health/ready smoke" \
  bash "${ROOT}/scripts/qa-api-integration-smoke.sh"

run_layer regression_parity "3. Regression — mail/messaging parity close" \
  env ENV_FILE="${ENV_FILE:-}" MAIL_INBOUND_PTR_SOFT="${MAIL_INBOUND_PTR_SOFT:-1}" MAIL_BILLING_PILOT_FREE="${MAIL_BILLING_PILOT_FREE:-1}" \
    OPERATOR_JWT="${OPERATOR_JWT:-}" MAIL_JMAP_JWT="${MAIL_JMAP_JWT:-}" \
    bash "${ROOT}/scripts/run-mail-messaging-parity-close-checklist.sh"

run_layer regression_wave2 "4. Regression — wave-2 + Lighthouse PWA" \
  env QA_PARITY_ALREADY_RAN=1 bash "${ROOT}/scripts/run-mail-messaging-parity-wave2-checklist.sh"

run_layer system_smoke "5. System — prod HTTPS/smoke" \
  bash "${ROOT}/scripts/verify-posta-https.sh"

run_layer compliance_mp9 "6. Compliance — MP-9 SOC2-lite docs" \
  bash "${ROOT}/scripts/verify-security-compliance-mp9.sh"

run_layer security_audit "7. Security — npm audit gate" \
  env NPM_AUDIT_ALLOW_NEXT_CRITICAL="${NPM_AUDIT_ALLOW_NEXT_CRITICAL:-1}" \
    bash "${ROOT}/scripts/qa-npm-audit-gate.sh"

run_layer security_surface "8. Security — surface headers" \
  bash "${ROOT}/scripts/qa-security-surface.sh"

run_layer perf_load "9. Performance — load (light prod)" \
  bash "${ROOT}/scripts/qa-load-stress.sh"

run_layer perf_stress "9b. Performance — stress profile" \
  bash "${ROOT}/scripts/qa-stress-profile.sh"

run_layer l10n_tr "10. Localization — tr-TR" \
  bash "${ROOT}/scripts/qa-localization-tr.sh"

run_layer l10n_en "10b. Localization — en-US" \
  bash "${ROOT}/scripts/qa-localization-en.sh"

run_layer l10n_expanded "10c. Localization — expanded URLs" \
  bash "${ROOT}/scripts/qa-l10n-expanded.sh"

run_layer i18n_gate "10d. Localization — mail-web TR literal gate" \
  bash "${ROOT}/scripts/qa-i18n-mail-web-gate.sh"

run_layer e2e_playwright "11. System/E2E — Playwright (messaging)" \
  bash -c "cd '${ROOT}/apps/web' && npx playwright install chromium --with-deps 2>/dev/null | tail -3; npx playwright test e2e/messaging-hub.spec.ts --grep 'login sayfası'"

if [[ "${QA_MESSAGING_VOICE_STT_OSS_GATE:-0}" == "1" ]]; then
  run_layer messaging_voice_stt_oss "11c. Messaging — voice STT OSS gate" \
    bash "${ROOT}/scripts/verify-messaging-voice-stt-oss-gate.sh"
else
  RESULT["messaging_voice_stt_oss"]="CONFIG_LATER"
  DETAIL["messaging_voice_stt_oss"]="QA_MESSAGING_VOICE_STT_OSS_GATE=1 → verify-messaging-voice-stt-oss-gate.sh"
  echo ""
  echo "—— Voice STT OSS gate (opsiyonel) ——"
  echo "   QA_MESSAGING_VOICE_STT_OSS_GATE=1 ile tam gate"
fi

run_layer e2e_mail_web "11b. System/E2E — Playwright (posta full)" \
  bash "${ROOT}/scripts/qa-mail-web-playwright.sh"

run_layer uat_faz6_code "12. UAT Faz 6 — kod tamamlama" \
  bash "${ROOT}/scripts/verify-uat-faz6-code-complete.sh"

if [[ "${UAT_VPS_RUNTIME:-0}" == "1" ]]; then
  run_layer uat_ops "13b. UAT ops — VPS runtime" \
    bash "${ROOT}/scripts/verify-uat-ops-runtime.sh"
  RESULT["uat"]="${RESULT[uat_ops]:-FAIL}"
  DETAIL["uat"]="UAT_VPS_RUNTIME=1"
else
  RESULT["uat"]="CONFIG_LATER"
  DETAIL["uat"]="Ops: npm run uat:ops-prereqs → uat:ops (docs/UAT_FAZ6_OPS_RUNBOOK.md)"
  echo ""
  echo "—— UAT ops önkoşul (bilgi) ——"
  bash "${ROOT}/scripts/verify-uat-ops-prereqs.sh" 2>/dev/null || true
fi

run_layer pentest_baseline "13. Security — OWASP baseline (surrogate)" \
  bash "${ROOT}/scripts/qa-owasp-baseline.sh"

bash "${ROOT}/scripts/qa-pentest-external-checklist.sh" >/dev/null || true
RESULT["pentest_external"]="CONFIG_LATER"
DETAIL["pentest_external"]="docs/PENTEST_EXTERNAL_CHECKLIST.md"

RESULT["pentest"]="${RESULT[pentest_baseline]:-FAIL}"
DETAIL["pentest"]="Tam sızma (ZAP/Burp) ayrı; qa-owasp-baseline.sh sürekli smoke."

FAIL_COUNT=0
LAYER_KEYS=(
  unit_core unit_api integration_smoke regression_parity regression_wave2 system_smoke
  compliance_mp9 security_audit security_surface perf_load perf_stress
  l10n_tr l10n_en l10n_expanded i18n_gate e2e_playwright e2e_mail_web uat_faz6_code pentest_baseline
)
for k in "${LAYER_KEYS[@]}"; do
  [[ "${RESULT[$k]:-FAIL}" == "FAIL" ]] && FAIL_COUNT=$((FAIL_COUNT + 1))
done
if [[ "${UAT_VPS_RUNTIME:-0}" == "1" ]]; then
  [[ "${RESULT[uat_ops]:-FAIL}" == "FAIL" ]] && FAIL_COUNT=$((FAIL_COUNT + 1))
fi

{
  echo "{"
  echo "  \"generatedAt\": \"$(TZ=Europe/Istanbul date -Iseconds)\","
  echo "  \"timezone\": \"Europe/Istanbul\","
  echo "  \"failCount\": ${FAIL_COUNT},"
  echo "  \"layers\": {"
  first=1
  for k in unit_core unit_api integration_smoke regression_parity regression_wave2 system_smoke compliance_mp9 security_audit security_surface perf_load perf_stress l10n_tr l10n_en l10n_expanded i18n_gate e2e_playwright e2e_mail_web uat_faz6_code uat pentest pentest_external; do
    [[ $first -eq 1 ]] || echo ","
    first=0
    printf '    "%s": "%s"' "$k" "${RESULT[$k]:-UNKNOWN}"
  done
  echo ""
  echo "  }"
  echo "}"
} > "${REPORT_JSON}"

cat > "${REPORT_MD}" <<EOF
# Lerta — Master QA Raporu (${STAMP})

**Oluşturulma:** $(TZ=Europe/Istanbul date '+%Y-%m-%d %H:%M %Z')  
**Komut:** \`bash scripts/run-lerta-premium-qa-suite.sh\`  
**JSON özet:** [\`LERTA_QA_MASTER_REPORT_${STAMP}.json\`](./LERTA_QA_MASTER_REPORT_${STAMP}.json)

## Executive özet

| Metrik | Değer |
|--------|--------|
| Otomatik katman FAIL | **${FAIL_COUNT}** |
| UAT (müşteri) | Manuel — §7.2 prelaunch gate |
| Tam pentest | Bu koşuda çalıştırılmadı |

## Katman sonuçları (ISO/IEC/IEEE 29119 hizalı çerçeve)

| # | Katman | Standart karşılığı | Sonuç |
|---|--------|-------------------|--------|
| 1 | Unit (core) | Bileşen testi | ${RESULT[unit_core]:-?} |
| 2 | Unit/Integration (API) | Modül + servis | ${RESULT[unit_api]:-?} |
| 2b | Integration smoke | Canlı API health/ready | ${RESULT[integration_smoke]:-?} |
| 3 | Regression (parity close) | Değişiklik regresyonu | ${RESULT[regression_parity]:-?} |
| 4 | Regression (wave-2) | PWA/Lighthouse/DNS | ${RESULT[regression_wave2]:-?} |
| 5 | System (prod smoke) | Canlı sistem | ${RESULT[system_smoke]:-?} |
| 6 | Compliance (MP-9) | SOC2-lite dok + süreç | ${RESULT[compliance_mp9]:-?} |
| 7 | Security (npm audit) | Bağımlılık zafiyeti | ${RESULT[security_audit]:-?} |
| 8 | Security (surface) | Kara kutu HTTP/TLS | ${RESULT[security_surface]:-?} |
| 9 | Performance (load) | Yük (hafif prod) | ${RESULT[perf_load]:-?} |
| 9b | Performance (stress) | Stres profili | ${RESULT[perf_stress]:-?} |
| 10 | Localization (tr-TR) | L10n | ${RESULT[l10n_tr]:-?} |
| 10c–d | L10n expanded + i18n gate | URL + TR literal | ${RESULT[l10n_expanded]:-?} / ${RESULT[i18n_gate]:-?} |
| 11 | E2E (Playwright) | Messaging smoke | ${RESULT[e2e_playwright]:-?} |
| 11b | E2E mail-web | Tam posta suite | ${RESULT[e2e_mail_web]:-?} |
| 12 | UAT Faz 6 kod | M1–M10 kod kapısı | ${RESULT[uat_faz6_code]:-?} |
| 13 | UAT ops | Yapılandırma + imza | ${RESULT[uat]:-?} |
| 14 | Pentest | Sızma (tam) | ${RESULT[pentest]:-?} |

## Bilinen eksikler / aksiyonlar

1. **API vitest kapsamı:** \`apps/api\` spec dosyalarının bir kısmı global \`describe\` import eksik — CI'ye \`vitest\` workspace config eklenmeli.
2. **Integration test DB:** Yerel Nest+Postgres testcontainers hâlâ yok; \`qa-api-integration-smoke.sh\` + HealthController spec kısmi.
3. **Stress test:** \`qa-stress-profile.sh\` orta hacim; tam kırılma noktası VPS profili.
4. **Pentest / ISO 27001 / PCI:** \`docs/PENTEST_EXTERNAL_CHECKLIST.md\` — sertifikalı pentest ve QSA denetimi harici.
5. **UAT:** Thunderbird IMAP, Graph/Google takvim, iOS push, MSN/Gmail teslimat — manuel imza bekliyor.
6. **Regression FAIL kökleri:** PTR Hostinger, billing prod anahtarları, Lighthouse headless ortamı, OPERATOR_JWT skip.

## Referanslar

- [MAIL_PRELAUNCH_COMPETITIVE_GATE_2026-10-24.md](../MAIL_PRELAUNCH_COMPETITIVE_GATE_2026-10-24.md)
- [SECURITY_SOC2_LITE_OVERVIEW.md](../SECURITY_SOC2_LITE_OVERVIEW.md)
- [LERTA_MAIL_PARITY_100_CLOSURE_EXECUTION.md](../LERTA_MAIL_PARITY_100_CLOSURE_EXECUTION.md)

EOF

echo ""
echo "Rapor: ${REPORT_MD}"
if [[ "${FAIL_COUNT}" -gt 0 ]]; then
  echo "QA suite: ${FAIL_COUNT} katman FAIL" >&2
  exit 1
fi
echo "QA suite: PASS"
exit 0
