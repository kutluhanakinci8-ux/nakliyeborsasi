#!/usr/bin/env bash
# isimtescil.net — Lerta Post DNS kayıt listesi (operatör kopyala-yapıştır).
set -euo pipefail

ZONE="${MAIL_PLATFORM_INSTANT_POST_ZONE:-post.lerta.com.tr}"
IP="${MAIL_PLATFORM_SPF_IPV4:-168.231.109.27}"
MX="${MAIL_PLATFORM_MX_HOST:-mail.lerta.com.tr}"
INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"

echo "========== Lerta Post — ${ZONE} (tüm kutular) =========="
echo "TXT  host: post          →  v=spf1 ip4:${IP} -all"
echo "TXT  host: _dmarc.post   →  v=DMARC1; p=none; rua=mailto:dmarc@lerta.com.tr; adkim=r; aspf=r"
echo "MX   host: *.post        →  10 ${MX}"
echo "(Panelde tam host adları: post.lerta.com.tr, _dmarc.post.lerta.com.tr, *.post.lerta.com.tr)"
echo ""

if [[ -d /etc/opendkim/keys ]]; then
  echo "========== Tenant DKIM (OpenDKIM keys) =========="
  for dir in /etc/opendkim/keys/*."${ZONE}"; do
    [[ -d "${dir}" ]] || continue
    domain=$(basename "${dir}")
    txt="${dir}/default.txt"
    if [[ -f "${txt}" ]]; then
      flat=$(tr -d '\n"' < "${txt}")
      echo "TXT  default._domainkey.${domain}"
      echo "      ${flat}"
      echo ""
    fi
  done
fi

if [[ -f "${INSTALL_DIR}/.env" ]] && command -v psql >/dev/null 2>&1; then
  DB_URL=$(grep -E '^DATABASE_URL=' "${INSTALL_DIR}/.env" | cut -d= -f2- | tr -d '"')
  if [[ -n "${DB_URL}" ]]; then
    echo "========== Veritabanı (instant_post dnsSnapshot) =========="
    psql "${DB_URL}" -At -c "
      SELECT domain,
             dns_snapshot->>'dkimHost' AS dkim_host,
             left(dns_snapshot->>'dkimTxt', 80) AS dkim_txt_prefix
      FROM mail_domain
      WHERE domain_type IN ('instant_post','instant_box')
      ORDER BY domain;
    " 2>/dev/null || true
  fi
fi

echo "Doğrulama: bash scripts/verify-lerta-post-dns.sh [slug]"
