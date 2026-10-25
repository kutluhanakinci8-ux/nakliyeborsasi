#!/usr/bin/env bash
# Performans profili — k6 varsa k6, yoksa autocannon fallback.
set -euo pipefail

TARGET="${QA_LOAD_TARGET:-https://yonetim.lerta.com.tr/api/v1/health}"
DURATION="${QA_LOAD_DURATION:-15s}"
VUS="${QA_VUS:-30}"

echo "== QA k6/load profile target=${TARGET} =="

if command -v k6 >/dev/null 2>&1; then
  k6 run --vus "${VUS}" --duration "${DURATION}" - <<EOF
import http from 'k6/http';
import { check } from 'k6';
export default function () {
  const res = http.get('${TARGET}');
  check(res, { 'status 200': (r) => r.status === 200 });
}
EOF
  echo "qa-k6-profile: PASS (k6)"
  exit 0
fi

npx --yes autocannon -c "${VUS}" -d "${DURATION%s}" "${TARGET}" | tail -12
echo "qa-k6-profile: PASS (autocannon fallback)"
