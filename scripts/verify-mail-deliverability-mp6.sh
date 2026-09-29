#!/usr/bin/env bash
# MP-6: engagement export CSV + (opsiyonel) operatör analytics / deliverability-hub.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
# shellcheck source=scripts/resolve-operator-jwt.sh
source "${ROOT}/scripts/resolve-operator-jwt.sh" || true

echo "== MP-6 mail deliverability verify =="

npm run test:unit --prefix "${ROOT}" >/dev/null
echo "OK: core unit (emailOutboxMetadata + engagement helpers)"

JWT="${OPERATOR_JWT:-}"
if [[ -n "${JWT}" ]]; then
  code="$(curl -sS -o /tmp/mp6-export.csv -w "%{http_code}" --connect-timeout 5 --max-time 60 \
    -H "Authorization: Bearer ${JWT}" \
    "${API_BASE}/platform-admin/notifications/analytics/engagement-export?days=7&limit=5")"
  if [[ "${code}" != "200" ]]; then
    echo "FAIL: engagement-export HTTP ${code} (OPERATOR_JWT geçersiz veya platform admin değil)" >&2
    head -c 200 /tmp/mp6-export.csv >&2 || true
    echo >&2
    echo "İpucu: https://app.lerta.com.tr/admin/login → accessToken veya .env OPERATOR_TEST_EMAIL/PASSWORD" >&2
    exit 1
  fi
  csv="$(cat /tmp/mp6-export.csv)"
  python3 -c "import sys; line=sys.stdin.read().splitlines()[0]; assert 'organizationId' in line and 'eventType' in line; print('OK: engagement-export header', line[:80])" <<<"${csv}"

  summary="$(curl -fsS --connect-timeout 5 --max-time 30 \
    -H "Authorization: Bearer ${JWT}" \
    "${API_BASE}/platform-admin/notifications/analytics/summary?days=7")"
  python3 -c "import json,sys; d=json.load(sys.stdin); assert 'summary' in d; print('OK: analytics/summary keys', list(d['summary'].keys())[:5])" <<<"${summary}"
else
  echo "SKIP: OPERATOR_JWT yok — platform-admin engagement export"
fi

MAIL_JWT="${MAIL_DELIVERABILITY_TEST_JWT:-${MESSAGING_TEST_JWT:-}}"
if [[ -n "${MAIL_JWT}" ]]; then
  hub="$(curl -fsS --connect-timeout 5 --max-time 30 \
    -H "Authorization: Bearer ${MAIL_JWT}" \
    "${API_BASE}/company/mail-inbox/deliverability-hub?days=30")"
  python3 -c "import json,sys; d=json.load(sys.stdin)['hub']; assert 'engagement' in d or 'engagement30d' in d; assert 'dmarc' in d; print('OK: deliverability-hub score', d.get('score'))" <<<"${hub}"
else
  echo "SKIP: MAIL_DELIVERABILITY_TEST_JWT yok — deliverability-hub"
fi

echo "MP-6 mail deliverability verify: PASS"
