#!/usr/bin/env bash
# FS-10.6: axe kritik ihlal 0 (login sayfası veya public messaging redirect).
set -euo pipefail

URL="${MESSAGING_AXE_URL:-https://app.lerta.com.tr/login?next=%2Fmessaging%3Ftab%3Dsohbet}"
MAX_CRITICAL="${MESSAGING_AXE_MAX_CRITICAL:-0}"

if ! command -v npx >/dev/null 2>&1; then
  echo "SKIP: npx yok"
  exit 0
fi

echo "== axe: ${URL} (max critical ${MAX_CRITICAL}) =="
if [[ -z "${CHROMEDRIVER_PATH:-}" ]] && command -v npx >/dev/null 2>&1; then
  eval "$(npx --yes browser-driver-manager install chrome 2>/dev/null | grep '^CHROMEDRIVER_TEST_PATH=' | sed 's/CHROMEDRIVER_TEST_PATH/CHROMEDRIVER_PATH/')" || true
fi
out_dir="$(mktemp -d)"
axe_args=("${URL}" -d "${out_dir}")
if [[ -n "${CHROMEDRIVER_PATH:-}" && -x "${CHROMEDRIVER_PATH}" ]]; then
  axe_args+=(--chromedriver-path "${CHROMEDRIVER_PATH}")
fi
npx --yes @axe-core/cli "${axe_args[@]}" 2>/dev/null || true
report="$(find "${out_dir}" -name '*.json' -type f 2>/dev/null | head -1)"

critical="$(REPORT_PATH="${report}" python3 - <<'PY' 2>/dev/null || echo 999
import json, os
path = os.environ.get("REPORT_PATH", "")
try:
    d = json.load(open(path))
except OSError:
    print(999)
    raise SystemExit
violations = []
if isinstance(d, dict):
    violations = d.get("violations", [])
elif isinstance(d, list):
    for item in d:
        if isinstance(item, dict):
            violations.extend(item.get("violations", []))
print(sum(1 for v in violations if v.get("impact") == "critical"))
PY
)"
rm -rf "${out_dir}" 2>/dev/null || true

echo "Critical violations: ${critical}"
if [[ "${critical}" -le "${MAX_CRITICAL}" ]]; then
  echo "OK: axe messaging"
  exit 0
fi
echo "FAIL: critical ${critical} > ${MAX_CRITICAL}" >&2
exit 1
