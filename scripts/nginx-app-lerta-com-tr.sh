#!/usr/bin/env bash
# app.lerta.com.tr → Nakliye Borsası (Next :3011 + API :3010)
# U88 (www.lerta.com.tr) dokunulmaz.
set -euo pipefail

APP_HOST="${APP_HOST:-app.lerta.com.tr}"
WEB_PORT="${WEB_PORT:-3011}"
API_PORT="${API_PORT:-3010}"
NGINX_SITE="/etc/nginx/sites-available/nakliyeborsasi-app-lerta-com-tr.conf"
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

    location /api/v1/ {
        proxy_pass http://127.0.0.1:${API_PORT}/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
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

write_https() {
  cat >> "$NGINX_SITE" <<EOF

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${APP_HOST};

    ssl_certificate ${LE_DIR}/fullchain.pem;
    ssl_certificate_key ${LE_DIR}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 16m;

    location /api/v1/ {
        proxy_pass http://127.0.0.1:${API_PORT}/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location / {
        proxy_pass http://127.0.0.1:${WEB_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
}

write_http
ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/nakliyeborsasi-app-lerta-com-tr.conf
nginx -t
systemctl reload nginx
echo "HTTP: http://${APP_HOST}/"

if [[ -f "${LE_DIR}/fullchain.pem" ]]; then
  write_https
  nginx -t && systemctl reload nginx
  echo "HTTPS: https://${APP_HOST}/ (mevcut sertifika)"
  exit 0
fi

if command -v certbot >/dev/null 2>&1; then
  if certbot certonly --webroot -w "$CERTBOT_WEBROOT" -d "$APP_HOST" \
    --non-interactive --agree-tos --register-unsafely-without-email \
    --keep-until-expiring; then
    write_https
    nginx -t && systemctl reload nginx
    echo "HTTPS: https://${APP_HOST}/ (Let's Encrypt)"
  else
    echo "UYARI: Sertifika alınamadı. isimtescil: A kaydı app → 168.231.109.27"
    echo "Yayılma sonrası: bash $0"
  fi
else
  echo "certbot yok — önce HTTP kullanın."
fi
