#!/usr/bin/env bash
# P0 — Inbound itibar: PTR, MX, SPF, DMARC + (VPS'te) Postfix/Dovecot/Rspamd dinleyicileri.
# Değişiklik yapmaz. CI veya deploy sonrası smoke için.
#
# Kullanım:
#   bash scripts/verify-lerta-mail-inbound-p0.sh
#   TENANT_DOMAIN=lerta.com.tr MAIL_PLATFORM_DOMAIN=mail.lerta.com.tr bash scripts/verify-lerta-mail-inbound-p0.sh
#   LOCAL_VPS=1 bash scripts/verify-lerta-mail-inbound-p0.sh   # sunucuda port/servis kontrolü
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPECTED_IP="${MAIL_PLATFORM_SPF_IPV4:-168.231.109.27}"
MAIL_HOST="${MAIL_PLATFORM_DOMAIN:-mail.lerta.com.tr}"
TENANT="${TENANT_DOMAIN:-lerta.com.tr}"
FAIL=0

warn() {
  echo "UYARI: $*" >&2
  FAIL=1
}
ok() {
  echo "OK: $*"
}

echo "== Lerta Mail P0 inbound doğrulama =="
echo "IP=${EXPECTED_IP} mail_host=${MAIL_HOST} tenant=${TENANT}"
echo ""

echo "== DNS (mail host) =="
if bash "${ROOT}/scripts/verify-mail-dns-lerta.sh"; then
  ok "verify-mail-dns-lerta"
else
  warn "verify-mail-dns-lerta başarısız veya uyarılı"
fi

echo ""
echo "== DNS (posta tenant: ${TENANT}) =="
MX=$(dig +short MX "${TENANT}" 2>/dev/null | head -1)
echo "MX ${TENANT}: ${MX:-<yok>}"
if [[ -z "${MX}" ]]; then
  warn "tenant MX yok — örn. 10 ${MAIL_HOST}"
fi

SPF_TENANT=$(dig +short TXT "${TENANT}" 2>/dev/null | tr -d '"' | grep -i spf | head -1)
echo "SPF ${TENANT}: ${SPF_TENANT:-<yok>}"
if [[ -z "${SPF_TENANT}" ]] || [[ "${SPF_TENANT}" != *"v=spf1"* ]]; then
  warn "tenant SPF TXT eksik veya geçersiz"
else
  ok "tenant SPF kaydı var"
fi

DMARC=$(dig +short TXT "_dmarc.${TENANT}" 2>/dev/null | head -1)
echo "DMARC _dmarc.${TENANT}: ${DMARC:-<yok>}"
if [[ -z "${DMARC}" ]]; then
  warn "tenant DMARC önerilir (rua ile)"
fi

DKIM_SEL="${MAIL_DKIM_SELECTOR:-default}"
DKIM=$(dig +short TXT "${DKIM_SEL}._domainkey.${TENANT}" 2>/dev/null | head -1)
echo "DKIM ${DKIM_SEL}._domainkey.${TENANT}: ${DKIM:-<yok>}"
if [[ -z "${DKIM}" ]]; then
  warn "DKIM TXT yok — konsol DNS sihirbazından yayınlayın"
fi

echo ""
echo "== PTR =="
PTR=$(dig +short -x "${EXPECTED_IP}" 2>/dev/null | head -1)
echo "PTR ${EXPECTED_IP}: ${PTR:-<yok>}"
if [[ "${PTR}" != *"mail"* ]]; then
  if [[ "${MAIL_INBOUND_PTR_SOFT:-0}" == "1" ]]; then
    echo "UYARI: PTR mail hostname içermiyor — MAIL_INBOUND_PTR_SOFT=1 (docs/MAIL_PTR_HOSTINGER.md)"
  else
    warn "PTR mail hostname içermiyor (Hostinger panel — docs/MAIL_PTR_HOSTINGER.md)"
  fi
else
  ok "PTR"
fi

if [[ "${LOCAL_VPS:-0}" == "1" ]] || [[ -d /var/www/nakliyeborsasi ]]; then
  echo ""
  echo "== Yerel servisler (VPS) =="
  for port in 25 993; do
    if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
      ok "dinleyici :${port}"
    else
      warn "dinleyici :${port} yok — apply-mail-vps-inbound-stack.sh"
    fi
  done
  if command -v systemctl >/dev/null 2>&1; then
    for svc in postfix dovecot rspamd; do
      if systemctl is-active --quiet "${svc}" 2>/dev/null; then
        ok "systemctl ${svc} active"
      else
        warn "systemctl ${svc} inactive"
      fi
    done
  fi
  ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
  if [[ -f "${ENV_FILE}" ]]; then
    if grep -q '^MAIL_INBOUND_APPLY_POSTFIX=true' "${ENV_FILE}"; then
      ok "MAIL_INBOUND_APPLY_POSTFIX=true"
    else
      warn "MAIL_INBOUND_APPLY_POSTFIX ayarlı değil"
    fi
    if grep -q '^MAIL_IMAP_APPLY_DOVECOT=true' "${ENV_FILE}"; then
      ok "MAIL_IMAP_APPLY_DOVECOT=true"
    else
      warn "MAIL_IMAP_APPLY_DOVECOT ayarlı değil"
    fi
  fi
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "P0 inbound: PASS"
  exit 0
fi
echo "P0 inbound: FAIL (DNS/VPS) — docs/EMAIL_REMAINING_WORK_PLAN.md" >&2
exit 1
