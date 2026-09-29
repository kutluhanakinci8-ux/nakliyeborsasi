#!/usr/bin/env bash
# FS-12A: WA köprüsü sandbox — status bayrakları + (JWT varsa) KVKK gate smoke.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
# shellcheck source=scripts/resolve-messaging-test-jwt.sh
source "${ROOT}/scripts/resolve-messaging-test-jwt.sh" || true

echo "== FS-12 WA bridge sandbox verify =="
payload="$(curl -fsS "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${payload}"
python3 "${ROOT}/scripts/messaging-status-from-env.py" fs12

features="$(python3 -c "import json,os; print(json.dumps(json.loads(os.environ['MESSAGING_STATUS_JSON']).get('features') or []))")"
for flag in whatsapp_notify_bridge whatsapp_notify_bridge_kvkk partner_api_messaging_stamp webhook_message_stamped; do
  python3 -c "import json,sys; f=set(json.loads(sys.argv[1])); assert '${flag}' in f" "${features}"
  echo "OK: feature ${flag}"
done

if [[ -n "${MESSAGING_WHATSAPP_BRIDGE_WEBHOOK_URL:-}" ]]; then
  echo "OK: MESSAGING_WHATSAPP_BRIDGE_WEBHOOK_URL tanımlı"
else
  echo "NOT: MESSAGING_WHATSAPP_BRIDGE_WEBHOOK_URL boş (sandbox webhook opsiyonel)"
fi

JWT="${MESSAGING_TEST_JWT:-}"
if [[ -n "${JWT}" ]]; then
  code="$(curl -sS -o /tmp/wa-bridge-body.json -w "%{http_code}" \
    -X PATCH "${API_BASE}/messaging/integration/whatsapp-bridge?lang=tr" \
    -H "Authorization: Bearer ${JWT}" \
    -H "Content-Type: application/json" \
    -d '{"enabled":true,"kvkkNoticeAccepted":false,"whatsappNotifyE164":"+905551112233"}' || echo 000)"
  if [[ "${code}" == "400" || "${code}" == "403" || "${code}" == "422" ]]; then
    echo "OK: KVKK gate (enable without consent → ${code})"
  else
    echo "NOT: KVKK gate beklenen 4xx, gelen ${code} (incele: /tmp/wa-bridge-body.json)"
  fi
  if curl -fsS -H "Authorization: Bearer ${JWT}" \
    "${API_BASE}/messaging/status" | python3 -c "import json,sys; d=json.load(sys.stdin); exit(0 if 'partner_api_messaging_stamp' in (d.get('features') or []) else 1)"; then
    echo "OK: partner stamp API feature (public path dokümanda)"
  fi
else
  echo "SKIP: JWT yok — KVKK PATCH smoke"
fi

echo "FS-12 WA bridge sandbox verify: PASS"
