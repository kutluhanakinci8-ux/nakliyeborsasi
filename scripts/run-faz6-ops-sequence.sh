#!/usr/bin/env bash
# Faz 6 sıralı ops: önkoşul → runtime verify → sıralı UAT → (opsiyonel) customer-ready STRICT.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

export UAT_VPS_RUNTIME=1
export UAT_DEFER_OAUTH="${UAT_DEFER_OAUTH:-0}"

STAMP="$(TZ=Europe/Istanbul date '+%Y-%m-%d %H:%M %Z')"
echo "== Faz 6 ops sırası (${STAMP}) =="

echo ""
echo "—— Adım 1/5: önkoşullar ——"
if ! bash "${ROOT}/scripts/verify-uat-ops-prereqs.sh"; then
  echo "DUR: önkoşulları tamamlayın → docs/UAT_FAZ6_OPS_RUNBOOK.md" >&2
  exit 1
fi

echo ""
echo "—— Adım 2/5: OAuth env ——"
bash "${ROOT}/scripts/verify-uat-oauth-env.sh"

echo ""
echo "—— Adım 3/5: ops runtime ——"
bash "${ROOT}/scripts/verify-uat-ops-runtime.sh"

echo ""
echo "—— Adım 4/5: sıralı UAT (M1/M2/M9) ——"
bash "${ROOT}/scripts/uat-faz6-sequential.sh"

if [[ "${RUN_CUSTOMER_READY_STRICT:-0}" == "1" ]]; then
  echo ""
  echo "—— Adım 5/5: customer-ready (STRICT) ——"
  STRICT_CUSTOMER_READY=1 npm run customer-ready --prefix "${ROOT}"
else
  echo ""
  echo "—— Adım 5/5: atlandı (RUN_CUSTOMER_READY_STRICT=1 ile zorunlu müşteri kapısı) ——"
fi

echo ""
echo "run-faz6-ops-sequence: PASS"
