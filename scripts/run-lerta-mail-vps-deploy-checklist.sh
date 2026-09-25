#!/usr/bin/env bash
# Lerta Mail VPS deploy sonrası otomatik smoke (değişiklik yapmaz).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE="${API_BASE:-https://yonetim.lerta.com.tr/api/v1}"
FAIL=0

echo "== Lerta Mail VPS deploy checklist =="

echo ""
echo "== G0 posta HTTPS =="
if bash "${ROOT}/scripts/verify-posta-https.sh"; then
  echo "OK"
else
  FAIL=1
fi

echo ""
echo "== API health =="
if curl -fsS --connect-timeout 12 "${API_BASE%/api/v1}/health" -o /dev/null 2>/dev/null ||
  curl -fsS --connect-timeout 12 "${API_BASE}/health" -o /dev/null 2>/dev/null; then
  echo "OK: health endpoint"
else
  echo "NOT: health yanıt vermedi" >&2
  FAIL=1
fi

echo ""
echo "== Public status =="
STATUS_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 12 \
  "${API_BASE}/public/lerta-mail/status" 2>/dev/null || echo "000")"
echo "GET public/lerta-mail/status → ${STATUS_CODE}"
if [[ "$STATUS_CODE" == "200" ]]; then
  echo "OK"
else
  echo "NOT: status API" >&2
  FAIL=1
fi

echo ""
echo "== Vitrin (kurumsal) =="
if BASE_URL="${VITRIN_BASE_URL:-https://kurumsal.lerta.com.tr}" \
  bash "${ROOT}/scripts/smoke-www-cutover-lerta-mail.sh"; then
  echo "OK"
else
  echo "NOT: vitrin smoke" >&2
  FAIL=1
fi

echo ""
echo "== Billing config (yerel .env) =="
if bash "${ROOT}/scripts/verify-mail-billing-config.sh"; then
  echo "OK"
else
  echo "NOT: billing env" >&2
  FAIL=1
fi

if [[ -n "${OPERATOR_JWT:-}" ]]; then
  echo ""
  echo "== A1 billing-health =="
  if OPERATOR_JWT="${OPERATOR_JWT}" bash "${ROOT}/scripts/run-mail-billing-a1-acceptance.sh"; then
    echo "OK"
  else
    echo "NOT: A1 acceptance" >&2
    FAIL=1
  fi
else
  echo ""
  echo "SKIP: OPERATOR_JWT yok — A1 API checklist atlandı"
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "Checklist: PASS"
  exit 0
fi
echo "Checklist: FAIL — docs/MAIL_VPS_DEPLOY_RUNBOOK.md" >&2
exit 1
