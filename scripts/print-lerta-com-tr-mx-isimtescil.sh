#!/usr/bin/env bash
# isimtescil — @lerta.com.tr dışarıdan gelen posta (MX zorunlu)
set -euo pipefail
IP="${MAIL_PLATFORM_SPF_IPV4:-168.231.109.27}"
MX_HOST="${MAIL_PLATFORM_MX_HOST:-mail.lerta.com.tr}"

echo "========== lerta.com.tr — gelen posta (tüm *@lerta.com.tr) =========="
echo "MX   host: @ (kök)     →  10 ${MX_HOST}"
echo "A    host: mail        →  ${IP}   (zaten varsa dokunmayın)"
echo ""
echo "Önerilen (gönderim + itibar):"
echo "TXT  host: @            →  v=spf1 ip4:${IP} -all"
echo "TXT  host: _dmarc       →  v=DMARC1; p=none; rua=mailto:dmarc@lerta.com.tr"
echo ""
echo "Doğrulama (yayın sonrası 5–30 dk):"
echo "  dig +short MX lerta.com.tr"
echo "  bash scripts/verify-mail-dns-lerta.sh"
echo ""
echo "Not: Giden posta MX olmadan çalışabilir; GELEN posta için MX şart."
