#!/usr/bin/env bash
# isimtescil.net — Lerta kurumsal posta DNS (kopyala-yapıştır operatör listesi)
set -euo pipefail

IP="${MAIL_PLATFORM_SPF_IPV4:-168.231.109.27}"
MX_HOST="${MAIL_PLATFORM_MX_HOST:-mail.lerta.com.tr}"
TENANT="${MAIL_PLATFORM_TENANT_DOMAIN:-lerta.com.tr}"
INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"

print_dkim() {
  local domain="$1"
  local label="$2"
  local path="/etc/opendkim/keys/${domain}/default.txt"
  if [[ -f "${path}" ]]; then
    local flat
    flat="$(tr -d '\n\t"' < "${path}" | sed 's/  */ /g')"
    echo "TXT  host: default._domainkey${label}"
    echo "      ${flat}"
    echo ""
  else
    echo "TXT  host: default._domainkey${label}"
    echo "      (VPS: bash ${INSTALL_DIR}/scripts/setup-mail-lerta-com-tr-pilot.sh)"
    echo ""
  fi
}

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  LERTA KURUMSAL POSTA — isimtescil DNS (${TENANT})               ║"
echo "║  VPS IP: ${IP}  ·  MTA: ${MX_HOST}                              ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

echo "━━━ ZORUNLU — DIŞARIDAN GELEN POSTA (*@${TENANT}) ━━━"
echo "MX   host: @ (kök)              →  öncelik 10  ${MX_HOST}"
echo "A    host: mail                 →  ${IP}"
echo ""

echo "━━━ ZORUNLU — UYGULAMA (WEBMAIL) ━━━"
echo "A    host: posta                →  ${IP}    (https://posta.${TENANT})"
echo "A    host: mail                 →  ${IP}    (SMTP/IMAP — yukarıdaki ile aynı)"
echo ""

echo "━━━ ZORUNLU — GÜVENİLİR GİDEN (@${TENANT} kutuları) ━━━"
echo "TXT  host: @                    →  v=spf1 ip4:${IP} -all"
print_dkim "${TENANT}" ""
echo "TXT  host: _dmarc               →  v=DMARC1; p=none; rua=mailto:dmarc@${TENANT}; pct=100"
echo ""

echo "━━━ ZORUNLU — PLATFORM SİSTEM POSTASI (notifications@${MX_HOST}) ━━━"
echo "TXT  host: mail                 →  v=spf1 ip4:${IP} -all"
print_dkim "${MX_HOST}" ".mail"
echo "TXT  host: _dmarc.mail           →  v=DMARC1; p=none; rua=mailto:dmarc@${TENANT}"
echo ""

echo "━━━ HOSTINGER (DNS DEĞİL) — PTR ━━━"
echo "IP ${IP}  →  rDNS/PTR: ${MX_HOST}"
echo ""

echo "━━━ İSTEĞE BAĞLI — VİTRİN / YÖNETİM ━━━"
echo "A    host: kurumsal             →  ${IP}"
echo "A    host: yonetim              →  ${IP}"
echo ""

echo "━━━ İSTEĞE BAĞLI — ESKİ LERTA POST (@firma.post) ━━━"
echo "(Yalnızca @${TENANT} kullanıyorsanız ATLAYIN)"
echo "MX   host: *.post                →  10 ${MX_HOST}"
echo "TXT  host: post                 →  v=spf1 ip4:${IP} -all"
echo "TXT  host: _dmarc.post           →  v=DMARC1; p=none; rua=mailto:dmarc@${TENANT}; adkim=r; aspf=r"
echo ""

echo "━━━ İSTEĞE BAĞLI — DMARC SIKILAŞTIRMA (rapor toplandıktan sonra) ━━━"
echo "TXT  host: _dmarc               →  v=DMARC1; p=quarantine; rua=mailto:dmarc@${TENANT}; pct=100"
echo ""

echo "━━━ DOKUNMAYIN ━━━"
echo "www / kök site (U88) — mevcut yönlendirme"
echo ""

echo "Doğrulama:"
echo "  bash scripts/verify-mail-dns-lerta.sh"
echo "  dig +short MX ${TENANT}"
echo ""
echo "Tam rehber: docs/DNS_LERTA_COM_TR_KURUMSAL_ISIMTESCIL.md"
