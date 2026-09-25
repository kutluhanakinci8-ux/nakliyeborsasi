#!/usr/bin/env bash
# posta.lerta.com.tr yalnızca mail-web (:3012) olmalı; başka site dosyalarında görünmemeli.
set -euo pipefail

POSTA_HOST="${POSTA_HOST:-posta.lerta.com.tr}"
MAIL_SITE="${MAIL_SITE:-/etc/nginx/sites-enabled/lerta-posta-mail-web.conf}"
ENABLED="/etc/nginx/sites-enabled"

echo "==> server_name içinde '${POSTA_HOST}' geçen enabled siteler:"
found=0
while IFS= read -r f; do
  [[ -f "$f" ]] || continue
  if grep -q "${POSTA_HOST}" "$f" 2>/dev/null; then
    echo "  - $f"
    found=1
  fi
done < <(find "$ENABLED" -maxdepth 1 -type f -o -type l 2>/dev/null | sort)

if [[ "$found" -eq 0 ]]; then
  echo "  (hiçbiri — HTTP vhost eksik; scripts/nginx-posta-lerta-com-tr.sh çalıştırın)"
fi

if [[ -f "$MAIL_SITE" ]] && grep -q "${POSTA_HOST}" "$MAIL_SITE"; then
  echo "OK: mail vhost dosyası var: $MAIL_SITE"
else
  echo "UYARI: $MAIL_SITE yok veya server_name eksik."
fi

echo ""
echo "==> Canlı başlık testi (sunucudan):"
for scheme in http https; do
  title=$(curl -sL -k --connect-timeout 5 "${scheme}://${POSTA_HOST}/login" 2>/dev/null | grep -oE '<title>[^<]+</title>' | head -1 || true)
  echo "  ${scheme}://${POSTA_HOST}/login → ${title:-(yanıt yok)}"
done

echo ""
echo "Beklenen: <title>Lerta Posta</title> (HTTP ve HTTPS)."
echo "Ekolojik / U88 görürseniz: HTTPS sertifikası posta için yok veya başka site default_server — nginx-posta + certbot."
