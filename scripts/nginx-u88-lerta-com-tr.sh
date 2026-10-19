#!/usr/bin/env bash
# u88.lerta.com.tr → U88 SPA (/var/www/u88-app/dist) + API (:8091)
set -euo pipefail

APP_HOST="${APP_HOST:-u88.lerta.com.tr}"
U88_DIST_ROOT="${U88_DIST_ROOT:-/var/www/u88-app/dist}"
U88_API_UPSTREAM="${U88_API_UPSTREAM:-http://127.0.0.1:8091}"
NGINX_SITE="/etc/nginx/sites-available/u88-lerta-com-tr.conf"
CERTBOT_WEBROOT="/var/www/certbot"
LE_DIR="/etc/letsencrypt/live/${APP_HOST}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "root ile çalıştırın." >&2
  exit 1
fi

if [[ ! -f "${U88_DIST_ROOT}/index.html" ]]; then
  echo "U88 dist bulunamadı: ${U88_DIST_ROOT}/index.html" >&2
  exit 1
fi

mkdir -p "$CERTBOT_WEBROOT"

write_server_block() {
  local scheme_extra="$1"
  cat <<EOF
    root ${U88_DIST_ROOT};
    index index.html;
    client_max_body_size 32m;
${scheme_extra}

    location ^~ /.well-known/acme-challenge/ {
        root ${CERTBOT_WEBROOT};
        default_type text/plain;
    }

    location /api/ {
        proxy_pass ${U88_API_UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    location = /health {
        proxy_pass ${U88_API_UPSTREAM}/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files \$uri =404;
    }

    location /assets/ {
        expires 7d;
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
EOF
}

write_http() {
  cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${APP_HOST};

$(write_server_block "")
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

$(write_server_block "")
}
EOF
}

write_http
ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/$(basename "$NGINX_SITE")"
nginx -t && systemctl reload nginx
echo "HTTP: http://${APP_HOST}/ → ${U88_DIST_ROOT}"

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
  else
    echo "NOT: ${APP_HOST} DNS A kaydı (168.231.109.27) + certbot gerekli."
  fi
fi
