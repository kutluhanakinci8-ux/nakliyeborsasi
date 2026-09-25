#!/usr/bin/env bash
# www.lerta.com.tr + lerta.com.tr → mail marketing (:3014)
# UYARI: Mevcut www (U88) içeriğini ezer — cutover öncesi yedek alın.
set -euo pipefail

APP_HOST_WWW="${APP_HOST_WWW:-www.lerta.com.tr}"
APP_HOST_APEX="${APP_HOST_APEX:-lerta.com.tr}"
WEB_PORT="${WEB_PORT:-3014}"
NGINX_SITE="/etc/nginx/sites-available/lerta-www-mail-marketing.conf"
CERTBOT_WEBROOT="/var/www/certbot"
LE_WWW="/etc/letsencrypt/live/${APP_HOST_WWW}"

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
    server_name ${APP_HOST_WWW} ${APP_HOST_APEX};

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
    server_name ${APP_HOST_WWW} ${APP_HOST_APEX};

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
    server_name ${APP_HOST_WWW} ${APP_HOST_APEX};

    ssl_certificate ${LE_WWW}/fullchain.pem;
    ssl_certificate_key ${LE_WWW}/privkey.pem;
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
echo "HTTP: http://${APP_HOST_WWW}/"

if [[ -f "${LE_WWW}/fullchain.pem" ]]; then
  write_https
  nginx -t && systemctl reload nginx
  echo "HTTPS aktif."
  exit 0
fi

if command -v certbot >/dev/null 2>&1; then
  certbot certonly --webroot -w "$CERTBOT_WEBROOT" \
    -d "$APP_HOST_WWW" -d "$APP_HOST_APEX" \
    --non-interactive --agree-tos -m "admin@lerta.com.tr" || true
  if [[ -f "${LE_WWW}/fullchain.pem" ]]; then
    write_https
    nginx -t && systemctl reload nginx
    echo "HTTPS aktif."
  fi
fi
