#!/usr/bin/env bash
# kurumsal.lerta.com.tr → https://www.lerta.com.tr (cutover sonrası isteğe bağlı)
set -euo pipefail

FROM_HOST="${FROM_HOST:-kurumsal.lerta.com.tr}"
TO_HOST="${TO_HOST:-www.lerta.com.tr}"
NGINX_SITE="/etc/nginx/sites-available/lerta-kurumsal-redirect-www.conf"
CERTBOT_WEBROOT="/var/www/certbot"
LE_FROM="/etc/letsencrypt/live/${FROM_HOST}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "root ile çalıştırın." >&2
  exit 1
fi

mkdir -p "$CERTBOT_WEBROOT"

write_vhost() {
  local ssl_block=""
  if [[ -f "${LE_FROM}/fullchain.pem" ]]; then
    ssl_block=$(cat <<EOF

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${FROM_HOST};

    ssl_certificate ${LE_FROM}/fullchain.pem;
    ssl_certificate_key ${LE_FROM}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://${TO_HOST}\$request_uri;
}
EOF
)
  fi

  cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${FROM_HOST};

    location ^~ /.well-known/acme-challenge/ {
        root ${CERTBOT_WEBROOT};
        default_type text/plain;
    }

    return 301 https://${TO_HOST}\$request_uri;
}
${ssl_block}
EOF
}

write_vhost
ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/$(basename "$NGINX_SITE")"
# Eski kurumsal marketing proxy devre dışı (çakışmayı önle)
rm -f /etc/nginx/sites-enabled/lerta-kurumsal-mail-marketing.conf 2>/dev/null || true
nginx -t && systemctl reload nginx
echo "Redirect: ${FROM_HOST} → https://${TO_HOST}"
