#!/usr/bin/env bash
# kurumsal.lerta.com.tr → Lerta Mail vitrin (:3014)
set -euo pipefail

APP_HOST="${APP_HOST:-kurumsal.lerta.com.tr}"
WEB_PORT="${WEB_PORT:-3014}"
NGINX_SITE="/etc/nginx/sites-available/lerta-kurumsal-mail-marketing.conf"
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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
}

write_http_redirect_to_https() {
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
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
}

write_http
ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/$(basename "$NGINX_SITE")"
nginx -t && systemctl reload nginx

echo "HTTP: http://${APP_HOST}/"

if [[ -d "$LE_DIR" ]]; then
  write_https
  nginx -t && systemctl reload nginx
  echo "HTTPS: https://${APP_HOST}/ (HTTP → HTTPS yönlendirme aktif)"
  exit 0
fi

if command -v certbot >/dev/null 2>&1; then
  if certbot certonly --webroot -w "$CERTBOT_WEBROOT" -d "$APP_HOST" \
    --non-interactive --agree-tos -m "admin@lerta.com.tr" 2>/dev/null; then
    write_https
    nginx -t && systemctl reload nginx
    echo "HTTPS: https://${APP_HOST}/ (HTTP → HTTPS yönlendirme aktif)"
  else
    echo "NOT: certbot başarısız (DNS A kaydı ${APP_HOST} → VPS gerekli)." >&2
  fi
else
  echo "NOT: certbot yok; yalnızca HTTP." >&2
fi
