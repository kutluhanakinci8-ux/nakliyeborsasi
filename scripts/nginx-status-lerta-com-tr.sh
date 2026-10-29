#!/usr/bin/env bash
# status.lerta.com.tr → https://www.lerta.com.tr/durum (halka açık durum sayfası alias)
set -euo pipefail

STATUS_HOST="${STATUS_HOST:-status.lerta.com.tr}"
TARGET_URL="${TARGET_URL:-https://www.lerta.com.tr/durum}"
NGINX_SITE="/etc/nginx/sites-available/lerta-status-redirect.conf"
CERTBOT_WEBROOT="/var/www/certbot"
LE_DIR="/etc/letsencrypt/live/${STATUS_HOST}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "root ile çalıştırın." >&2
  exit 1
fi

mkdir -p "$CERTBOT_WEBROOT"

write_vhost() {
  local ssl_block=""
  if [[ -f "${LE_DIR}/fullchain.pem" ]]; then
    ssl_block=$(cat <<EOF

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${STATUS_HOST};

    ssl_certificate ${LE_DIR}/fullchain.pem;
    ssl_certificate_key ${LE_DIR}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 302 ${TARGET_URL};
}
EOF
)
  fi

  cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${STATUS_HOST};

    location ^~ /.well-known/acme-challenge/ {
        root ${CERTBOT_WEBROOT};
        default_type text/plain;
    }

    return 302 ${TARGET_URL};
}
${ssl_block}
EOF
}

write_vhost
ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/$(basename "$NGINX_SITE")"
nginx -t && systemctl reload nginx
echo "Status alias: http(s)://${STATUS_HOST} → ${TARGET_URL}"
if [[ ! -f "${LE_DIR}/fullchain.pem" ]]; then
  echo "HTTPS için: certbot certonly --webroot -w ${CERTBOT_WEBROOT} -d ${STATUS_HOST}"
fi
