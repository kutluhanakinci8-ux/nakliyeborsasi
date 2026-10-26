#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

cfg="$(curl -fsS "${API_BASE}/auth/mobile/config")"
export MOBILE_CFG="${cfg}"
python3 <<'PY'
import json, os, sys
d = json.loads(os.environ["MOBILE_CFG"])
oauth = d.get("oauth") or {}
if not oauth.get("enabled"):
    print("SKIP: oauth.enabled false — MOBILE_OAUTH_LERTA_BRIDGE=1 gerekli")
    sys.exit(0)
te = oauth.get("tokenEndpoint")
if not te:
    raise SystemExit("FAIL: tokenEndpoint yok")
print("OK: mobile oauth config", te)
PY

disc_url="${API_BASE}/auth/mobile/.well-known/openid-configuration"
code="$(curl -s -o /tmp/oidc.json -w "%{http_code}" "${disc_url}")"
[[ "${code}" == "200" ]] || { echo "FAIL: discovery HTTP ${code}"; exit 1; }
grep -q token_endpoint /tmp/oidc.json
echo "OK: openid-configuration"
echo "verify-messaging-mobile-oauth-bridge: PASS"
