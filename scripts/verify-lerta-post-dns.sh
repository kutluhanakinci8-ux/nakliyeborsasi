#!/usr/bin/env bash
# Lerta Post — post.lerta.com.tr bölgesi ve tenant DKIM DNS kontrolü.
set -euo pipefail

ZONE="${MAIL_PLATFORM_INSTANT_POST_ZONE:-post.lerta.com.tr}"
EXPECTED_IP="${MAIL_PLATFORM_SPF_IPV4:-168.231.109.27}"
MX_HOST="${MAIL_PLATFORM_MX_HOST:-mail.lerta.com.tr}"
SLUG="${1:-}"

echo "=== Lerta Post DNS: ${ZONE} ==="

if ! host -t NS "${ZONE}" 2>/dev/null | grep -q "name server"; then
  echo "HATA: ${ZONE} bölgesi DNS'te yok (NXDOMAIN)."
  echo "isimtescil: lerta.com.tr altında 'post' alt bölgesi + wildcard MX/SPF ekleyin."
  echo "  bash scripts/print-instant-post-dns-isimtescil.sh"
  exit 1
fi

SPF=$(dig +short TXT "${ZONE}" | tr -d '"' | head -1)
echo "SPF (${ZONE}): ${SPF:-<yok>}"
if [[ "${SPF}" == *"${EXPECTED_IP}"* ]]; then
  echo "OK: zone SPF"
else
  echo "UYARI: v=spf1 ip4:${EXPECTED_IP} -all bekleniyor"
fi

DMARC=$(dig +short TXT "_dmarc.${ZONE}" | tr -d '"' | head -1)
echo "DMARC (_dmarc.${ZONE}): ${DMARC:-<yok>}"
if [[ -z "${DMARC}" ]]; then
  echo "UYARI: _dmarc.${ZONE} TXT ekleyin"
fi

WILD_MX=$(dig +short MX "probe.${ZONE}" | head -1)
echo "MX (probe.${ZONE}): ${WILD_MX:-<yok>}"
if [[ "${WILD_MX}" == *"${MX_HOST}"* ]]; then
  echo "OK: wildcard MX"
else
  echo "UYARI: *.${ZONE} → 10 ${MX_HOST}"
fi

if [[ -n "${SLUG}" ]]; then
  FQDN="${SLUG}.${ZONE}"
  echo ""
  echo "=== Tenant: ${FQDN} ==="
  TSPF=$(dig +short TXT "${FQDN}" | tr -d '"' | head -1)
  echo "SPF: ${TSPF:-<yok>}"
  DKIM=$(dig +short TXT "default._domainkey.${FQDN}" | tr -d '"' | head -1)
  if [[ "${DKIM}" == *"v=DKIM1"* ]]; then
    echo "OK: DKIM TXT yayında"
  else
    echo "UYARI: default._domainkey.${FQDN} TXT yok — OpenDKIM / API dnsSnapshot"
  fi
fi

echo "=== Bitti ==="
