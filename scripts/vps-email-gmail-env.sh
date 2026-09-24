#!/usr/bin/env bash
# VPS'te Gmail SMTP için .env günceller. Uygulama şifresini komut satırında geçmeyin;
# sunucuda:  read -s SMTP_PASS && export SMTP_PASS && bash scripts/vps-email-gmail-env.sh
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "HATA: $ENV_FILE bulunamadı" >&2
  exit 1
fi

SMTP_USER="${SMTP_USER:-lertalogistics@gmail.com}"
if [[ -z "${SMTP_PASS:-}" ]]; then
  echo "Google uygulama şifresi gerekli (16 karakter, boşluksuz veya boşluklu)." >&2
  echo "Örnek (sunucuda, şifre ekranda görünmez):" >&2
  echo "  read -s SMTP_PASS && export SMTP_PASS && bash scripts/vps-email-gmail-env.sh" >&2
  exit 1
fi

# Boşlukları kaldır (Google bazen 4x4 gruplar halinde verir)
SMTP_PASS_CLEAN="${SMTP_PASS// /}"

set_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

set_env "EMAIL_ENABLED" "true"
set_env "SMTP_PROFILE" "gmail"
set_env "SMTP_HOST" "smtp.gmail.com"
set_env "SMTP_PORT" "587"
set_env "SMTP_SECURE" "false"
set_env "SMTP_USER" "$SMTP_USER"
# Şifrede özel karakter olabilir; tırnak kullan
if grep -q "^SMTP_PASS=" "$ENV_FILE"; then
  sed -i "s|^SMTP_PASS=.*|SMTP_PASS=\"${SMTP_PASS_CLEAN}\"|" "$ENV_FILE"
else
  echo "SMTP_PASS=\"${SMTP_PASS_CLEAN}\"" >> "$ENV_FILE"
fi
set_env "SMTP_FROM" "Lerta Logistics <${SMTP_USER}>"
set_env "PLATFORM_ADMIN_EMAILS" "$SMTP_USER"
set_env "WEB_PUBLIC_BASE_URL" "https://168.231.109.27"

echo "=== Güncellenen e-posta satırları (şifre gizli) ==="
grep -E '^(EMAIL_ENABLED|SMTP_PROFILE|SMTP_HOST|SMTP_PORT|SMTP_SECURE|SMTP_USER|SMTP_FROM|PLATFORM_ADMIN|WEB_PUBLIC)' "$ENV_FILE" || true
echo "SMTP_PASS=*** (ayarlandı)"

cd "$INSTALL_DIR"
bash scripts/restart-api.sh

echo ""
echo "Sonraki adım: Admin → Mail yönetimi → «SMTP doğrula» → «Test gönder»"
echo "Gmail kutunuzu (Gelen) kontrol edin."
