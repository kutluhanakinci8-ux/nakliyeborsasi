#!/usr/bin/env bash
# MP-9: Müşteri due diligence ZIP (güvenlik + ops + DR referansları).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${ROOT}/dist"
ZIP="${OUT_DIR}/customer-due-diligence-mp9.zip"
mkdir -p "${OUT_DIR}"

list=(
  docs/SECURITY_SOC2_LITE_OVERVIEW.md
  docs/SECURITY_INCIDENT_RESPONSE.md
  docs/SECURITY_DATA_PROCESSING_INVENTORY.md
  docs/SECURITY_AUDIT_RETENTION_EXPORT.md
  docs/SECURITY_QUARTERLY_CHECKLIST.md
  docs/MESSAGING_POSTA_OPS_RUNBOOK.md
  docs/MAIL_BACKUP_DISASTER_RECOVERY.md
  docs/VPS_OPERATOR_COMMANDS.md
)

cd "${ROOT}"
rm -f "${ZIP}"
for rel in "${list[@]}"; do
  if [[ ! -f "${rel}" ]]; then
    echo "FAIL: ${rel} yok" >&2
    exit 1
  fi
done
zip -q -j "${ZIP}" "${list[@]}"
echo "OK: ${ZIP} ($(zipinfo -t "${ZIP}" | tail -1))"
