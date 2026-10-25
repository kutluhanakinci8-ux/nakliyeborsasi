#!/usr/bin/env bash
# Stres profili — yük testinden daha agresif; üretimde QA_STRESS_TARGET ile sınırla.
set -euo pipefail

TARGET="${QA_STRESS_TARGET:-${QA_LOAD_TARGET:-https://posta.lerta.com.tr/login}}"
CONCURRENCY="${QA_STRESS_CONCURRENCY:-80}"
REQUESTS="${QA_STRESS_REQUESTS:-800}"
MAX_ERROR_RATE="${QA_STRESS_MAX_ERROR_RATE:-0.05}"

echo "== QA Stress profile =="
echo "target=${TARGET} concurrency=${CONCURRENCY} requests=${REQUESTS} max_error_rate=${MAX_ERROR_RATE}"

if command -v k6 >/dev/null 2>&1; then
  k6 run --vus "${CONCURRENCY}" --duration 30s - <<EOF
import http from 'k6/http';
import { check, fail } from 'k6';

export const options = {
  thresholds: {
    http_req_failed: ['rate<${MAX_ERROR_RATE}'],
  },
};

export default function () {
  const res = http.get('${TARGET}');
  check(res, { 'status < 500': (r) => r.status < 500 });
}
EOF
  echo "qa-stress-profile: PASS (k6)"
  exit 0
fi

# Node pool — qa-load-stress ile aynı mantık, daha yüksek hacim
export QA_LOAD_TARGET="${TARGET}"
export QA_LOAD_CONCURRENCY="${CONCURRENCY}"
export QA_LOAD_REQUESTS="${REQUESTS}"
bash "$(dirname "$0")/qa-load-stress.sh"

echo "qa-stress-profile: PASS (node pool)"
