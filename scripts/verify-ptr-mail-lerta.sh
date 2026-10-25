#!/usr/bin/env bash
# PTR doğrulama: 168.231.109.27 → mail.lerta.com.tr (Hostinger panel/API ile ayarlanır, SSH ile değil).
set -euo pipefail

IP="${LERTA_VPS_IP:-168.231.109.27}"
HOST="${MAIL_PLATFORM_DOMAIN:-mail.lerta.com.tr}"
SOFT="${MAIL_INBOUND_PTR_SOFT:-0}"

echo "== PTR kontrolü =="
echo "IP: ${IP}"
echo "Beklenen PTR hostname: ${HOST}"

fwd="$(dig +short "${HOST}" A 2>/dev/null | head -1)"
echo "Forward A ${HOST}: ${fwd:-<yok>}"
if [[ "${fwd}" != "${IP}" ]]; then
  echo "NOT: Önce DNS A kaydı — ${HOST} → ${IP} (isimtescil / DNS paneli)" >&2
  echo "Hostinger PTR, A kaydı yoksa kayıt oluşturmayı reddeder." >&2
  exit 2
fi
echo "OK: forward A hizalı"

ptr="$(dig +short -x "${IP}" 2>/dev/null | head -1)"
ptr="${ptr%.}"
echo "PTR -x ${IP}: ${ptr:-<yok>}"

if [[ -n "${ptr}" ]] && [[ "${ptr}" == *"mail"* ]]; then
  echo "OK: PTR mail hostname içeriyor"
  exit 0
fi

echo ""
echo "PTR henüz doğru değil. SSH ile düzeltilemez — Hostinger hPanel:"
echo "  VPS → sunucunuz (srv1828484) → Settings → IP address → Set PTR record"
echo "  Değer: ${HOST}"
echo "Rehber: docs/MAIL_PTR_HOSTINGER.md"
echo "API: HOSTINGER_API_TOKEN + bash scripts/hostinger-set-ptr-mail-lerta.sh"

if [[ "${SOFT}" == "1" ]]; then
  echo "UYARI: MAIL_INBOUND_PTR_SOFT=1 — geçici bypass" >&2
  exit 0
fi
exit 1
