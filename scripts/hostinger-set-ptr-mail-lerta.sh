#!/usr/bin/env bash
# Hostinger API ile PTR ayarla (SSH şifresi işe yaramaz — API token gerekir).
# https://www.hostinger.com/support/4805528-how-to-setup-reverse-dns-on-vps/
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOKEN="${HOSTINGER_API_TOKEN:-}"
VM_ID="${HOSTINGER_VM_ID:-}"
IP_ADDR_ID="${HOSTINGER_IP_ADDRESS_ID:-}"
DOMAIN="${HOSTINGER_PTR_DOMAIN:-mail.lerta.com.tr}"
API_BASE="${HOSTINGER_API_BASE:-https://developers.hostinger.com/api/vps/v1}"

if [[ -z "${TOKEN}" ]]; then
  echo "HOSTINGER_API_TOKEN gerekli." >&2
  echo "hPanel → VPS → API → Create token (docs/MAIL_PTR_HOSTINGER.md)" >&2
  exit 1
fi

auth_hdr=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -H "Accept: application/json")

if [[ -z "${VM_ID}" ]] || [[ -z "${IP_ADDR_ID}" ]]; then
  echo "== VM / IP listesi (ID'leri .env'e yazın) =="
  curl -fsS "${auth_hdr[@]}" "${API_BASE}/virtual-machines" | python3 - <<'PY'
import json, sys
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get("data", data.get("virtual_machines", []))
for vm in items or []:
    vid = vm.get("id") or vm.get("virtualMachineId")
    name = vm.get("hostname") or vm.get("name") or ""
    print(f"VM id={vid} hostname={name}")
    for ip in vm.get("ips", []) or vm.get("ip_addresses", []) or []:
        iid = ip.get("id") or ip.get("ipAddressId")
        addr = ip.get("address") or ip.get("ip")
        print(f"  ipAddressId={iid} address={addr}")
PY
  echo ""
  echo "Sonra: HOSTINGER_VM_ID=... HOSTINGER_IP_ADDRESS_ID=... $0"
  exit 2
fi

body="$(python3 -c "import json; print(json.dumps({'domain': '${DOMAIN}'}))")"
echo "== PTR POST vm=${VM_ID} ip=${IP_ADDR_ID} domain=${DOMAIN} =="
curl -fsS -X POST "${auth_hdr[@]}" \
  -d "${body}" \
  "${API_BASE}/virtual-machines/${VM_ID}/ptr/${IP_ADDR_ID}"

echo ""
bash "${ROOT}/scripts/verify-ptr-mail-lerta.sh" || true
echo "Not: PTR propagasyonu birkaç dakika–24 saat sürebilir."
