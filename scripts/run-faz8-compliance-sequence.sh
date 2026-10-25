#!/usr/bin/env bash
# Faz 8 — uyumluluk: MP-9 doğrulama, due diligence paketi, kanıt indeksi JSON.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(TZ=Europe/Istanbul date -Iseconds)"
DAY="$(TZ=Europe/Istanbul date +%Y-%m-%d)"
REPORT="${ROOT}/docs/reports/FAZ8_COMPLIANCE_${DAY}.json"
mkdir -p "${ROOT}/docs/reports"

mp9="FAIL"
pack="SKIP"
customer_ready="UNKNOWN"

echo "== Faz 8 uyumluluk (${STAMP}) =="

echo ""
echo "—— 1/3 MP-9 verify ——"
if bash "${ROOT}/scripts/verify-security-compliance-mp9.sh"; then
  mp9="PASS"
fi

echo ""
echo "—— 2/3 Due diligence ZIP ——"
if bash "${ROOT}/scripts/pack-customer-due-diligence-mp9.sh"; then
  pack="PASS"
fi

echo ""
echo "—— 3/3 Kanıt indeksi ——"
latest_qa="$(ls -t "${ROOT}/docs/reports"/LERTA_QA_MASTER_REPORT_*.json 2>/dev/null | head -1 || true)"
latest_faz7="${ROOT}/docs/reports/FAZ7_PENTEST_${DAY}.json"
customer_gate="${ROOT}/docs/reports/CUSTOMER_READY_GATE_${DAY}.md"
[[ -f "${customer_gate}" ]] && customer_ready="PASS" || customer_ready="MISSING"

python3 - <<PY
import json
from pathlib import Path

root = Path("${ROOT}")
out = Path("${REPORT}")
payload = {
    "generatedAt": "${STAMP}",
    "timezone": "Europe/Istanbul",
    "mp9_verify": "${mp9}",
    "due_diligence_zip": "${pack}",
    "customer_ready_gate_today": "${customer_ready}",
    "artifacts": {
        "iso_traceability": "docs/ISO_29119_TEST_TRACEABILITY.md",
        "compliance_index": "docs/COMPLIANCE_EVIDENCE_INDEX.md",
        "soc2_lite": "docs/SECURITY_SOC2_LITE_OVERVIEW.md",
        "pentest_checklist": "docs/PENTEST_EXTERNAL_CHECKLIST.md",
        "zap_backlog": "docs/ZAP_WARN_REMEDIATION_BACKLOG.md",
        "qa_master_json": str(Path("${latest_qa}").relative_to(root)) if "${latest_qa}" else None,
        "faz7_json": "docs/reports/FAZ7_PENTEST_${DAY}.json" if Path("${latest_faz7}").is_file() else None,
        "due_diligence_zip": "dist/customer-due-diligence-mp9.zip",
    },
    "certification_out_of_scope": [
        "SOC 2 Type II denetim raporu",
        "ISO 27001 sertifikası",
        "PCI-DSS / HIPAA QSA (kapsam gerektirir)",
    ],
}
out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Wrote {out}")
PY

if [[ "${mp9}" != "PASS" ]]; then
  echo "run-faz8-compliance-sequence: FAIL (MP-9)" >&2
  exit 1
fi
echo "run-faz8-compliance-sequence: PASS"
exit 0
