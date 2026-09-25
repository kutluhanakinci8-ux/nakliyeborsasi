#!/usr/bin/env bash
# u88.lerta.com.tr → mevcut U88 / ana program (varsayılan Next :3011)
# Cutover öncesi www'yi buraya taşıyın; sonra www mail-marketing olur.
set -euo pipefail

APP_HOST="${APP_HOST:-u88.lerta.com.tr}"
WEB_PORT="${WEB_PORT:-3011}"
NGINX_SITE="/etc/nginx/sites-available/u88-lerta-com-tr.conf"
CERTBOT_WEBROOT="/var/www/certbot"
LE_DIR="/etc/letsencrypt/live/${APP_HOST}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "root ile çalıştırın." >&2
  exit 1
fi

mkdir -p "$CERTBOT_WEBROOT"

write_http() {
  cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${APP_HOST};

    location ^~ /.well-known/acme-challenge/ {
        root ${CERTBOT_WEBROOT};
        default_type text/plain;
    }

    location / {
        proxy_pass http://127.0.0.1:${WEB_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
}

write_https() {
  cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${APP_HOST};

    location ^~ /.well-known/acme-challenge/ {
        root ${CERTBOT_WEBROOT};
        default_type text/plain;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${APP_HOST};

    ssl_certificate ${LE_DIR}/fullchain.pem;
    ssl_certificate_key ${LE_DIR}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:${WEB_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
EOF
}

write_http
ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/$(basename "$NGINX_SITE")"
nginx -t && systemctl reload nginx
echo "HTTP: http://${APP_HOST}/ → :${WEB_PORT}"

if [[ -f "${LE_DIR}/fullchain.pem" ]]; then
  write_https
  nginx -t && systemctl reload nginx
  echo "HTTPS aktif."
  exit 0
fi

if command -v certbot >/dev/null 2>&1; then
  certbot certonly --webroot -w "$CERTBOT_WEBROOT" \
    -d "$APP_HOST" \
    --non-interactive --agree-tos -m "admin@lerta.com.tr" || true
  if [[ -f "${LE_DIR}/fullchain.pem" ]]; then
    write_https
    nginx -t && systemctl reload nginx
    echo "HTTPS aktif."
  fi
fi
