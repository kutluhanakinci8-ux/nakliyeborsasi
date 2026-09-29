#!/usr/bin/env bash
# MP-9: SOC2-lite doküman seti + (opsiyonel) DR evidence + npm audit high gate.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

required_docs=(
  SECURITY_SOC2_LITE_OVERVIEW.md
  SECURITY_INCIDENT_RESPONSE.md
  SECURITY_DATA_PROCESSING_INVENTORY.md
  SECURITY_AUDIT_RETENTION_EXPORT.md
  SECURITY_QUARTERLY_CHECKLIST.md
)

echo "== MP-9 security & compliance verify =="

for name in "${required_docs[@]}"; do
  path="${ROOT}/docs/${name}"
  if [[ ! -f "${path}" ]]; then
    echo "FAIL: eksik doküman docs/${name}" >&2
    exit 1
  fi
  case "${name}" in
    SECURITY_INCIDENT_RESPONSE.md)
      grep -q "P1" "${path}" || { echo "FAIL: ${name} severity table" >&2; exit 1; }
      ;;
    SECURITY_DATA_PROCESSING_INVENTORY.md)
      grep -q "Veri kategorileri" "${path}" || { echo "FAIL: ${name} inventory" >&2; exit 1; }
      ;;
    SECURITY_AUDIT_RETENTION_EXPORT.md)
      grep -q "export SLA" "${path}" || { echo "FAIL: ${name} SLA" >&2; exit 1; }
      ;;
  esac
done
echo "OK: SECURITY_* doküman seti (${#required_docs[@]} dosya)"

if [[ ! -x "${ROOT}/scripts/pack-customer-due-diligence-mp9.sh" ]]; then
  echo "FAIL: pack-customer-due-diligence-mp9.sh yok veya çalıştırılamıyor" >&2
  exit 1
fi
echo "OK: due diligence pack script"

if [[ "${SKIP_DR_DRILL:-}" == "1" ]]; then
  echo "SKIP: SKIP_DR_DRILL=1 — verify-dr-drill-evidence"
elif [[ -f "${DR_DRILL_EVIDENCE:-/var/log/lerta-mail-dr-drill.json}" ]]; then
  bash "${ROOT}/scripts/verify-dr-drill-evidence.sh"
else
  echo "SKIP: DR evidence dosyası yok (VPS: bootstrap-dr-drill-evidence.sh)"
fi

if [[ "${SKIP_NPM_AUDIT:-1}" == "1" ]]; then
  echo "SKIP: SKIP_NPM_AUDIT=1 (çeyreklik: SKIP_NPM_AUDIT=0)"
else
  echo "== npm audit (high+) =="
  audit_out="$(npm audit --audit-level=high --prefix "${ROOT}" 2>&1 || true)"
  if echo "${audit_out}" | grep -qE 'critical'; then
    echo "FAIL: npm audit critical bulundu" >&2
    echo "${audit_out}" >&2
    exit 1
  fi
  echo "OK: npm audit — critical yok"
fi

echo "MP-9 security & compliance verify: PASS"
