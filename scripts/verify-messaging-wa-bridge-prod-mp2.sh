#!/usr/bin/env bash
# MP-2: prod WA köprüsü — canlı /messaging/status + teslim kanalı yapılandırması.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

echo "== MP-2 WA bridge prod verify =="
bash "${ROOT}/scripts/verify-messaging-wa-bridge-sandbox.sh"

payload="$(curl -fsS --connect-timeout 8 --max-time 30 "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${payload}"
python3 "${ROOT}/scripts/messaging-status-from-env.py" fs12

wa="$(python3 -c "import json,os; print(json.dumps(json.loads(os.environ['MESSAGING_STATUS_JSON']).get('whatsappBridge') or {}))")"
export WA_JSON="${wa}"

python3 <<'PY'
import json, os, sys

wa = json.loads(os.environ["WA_JSON"])
channel = wa.get("channel")
configured = wa.get("deliveryConfigured")
warning = wa.get("deliveryWarningTr")
needs_sid = wa.get("twilioLikelyNeedsContentSid")

if channel == "none" or not configured:
    print("FAIL: whatsappBridge deliveryConfigured=false — TWILIO_* veya MESSAGING_WHATSAPP_BRIDGE_WEBHOOK_URL", file=sys.stderr)
    sys.exit(1)

print(f"OK: channel={channel} deliveryConfigured=true")

if needs_sid and os.environ.get("MP2_ALLOW_TWILIO_WITHOUT_CONTENT_SID") != "1":
    print("NOT: Twilio ContentSid eksik — trial hesaplarda 21654 riski (TWILIO_WHATSAPP_CONTENT_SID)", file=sys.stderr)
    if os.environ.get("MP2_WA_STRICT") == "1":
        sys.exit(1)

if warning:
    print(f"NOT: {warning}")
PY

echo "MP-2 WA bridge prod verify: PASS"
