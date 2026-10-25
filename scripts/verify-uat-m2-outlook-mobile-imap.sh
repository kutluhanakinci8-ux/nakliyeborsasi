#!/usr/bin/env bash
# UAT M2 — Outlook mobil IMAP: sunucu hazırlığı (uygulama kurulumu manuel).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${INSTALL_DIR:-${ROOT}}/.env}"
POSTA_BASE="${POSTA_BASE:-https://posta.lerta.com.tr}"
EMAIL="${IMAP_GOLD_EMAIL:-$(bash "${ROOT}/scripts/resolve-parity-imap-test-email.sh")}"

HOST=""
PORT_IMAP="993"
PORT_SMTP="587"

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1091
  source <(grep -E '^(MAIL_IMAP_HOST|MAIL_IMAP_PORT|MAIL_CLIENT_SMTP_HOST|MAIL_CLIENT_SMTP_PORT)=' "${ENV_FILE}" || true)
fi
HOST="${MAIL_IMAP_HOST:-mail.lerta.com.tr}"
PORT_IMAP="${MAIL_IMAP_PORT:-993}"
SMTP_HOST="${MAIL_CLIENT_SMTP_HOST:-${HOST}}"
PORT_SMTP="${MAIL_CLIENT_SMTP_PORT:-587}"

fail=0
ok() { echo "OK: $*"; }
warn() { echo "UYARI: $*" >&2; fail=$((fail + 1)); }
not() { echo "NOT: $*" >&2; fail=$((fail + 1)); }

echo "=== M2 Outlook mobil IMAP hazırlık (${EMAIL}) ==="
echo "IMAP ${HOST}:${PORT_IMAP} · SMTP ${SMTP_HOST}:${PORT_SMTP}"

echo ""
echo "—— Yardım sayfası ——"
code="$(curl -sS -o /tmp/m2-help-imap.html -w '%{http_code}' --connect-timeout 15 "${POSTA_BASE}/help/imap" || echo 000)"
if [[ "${code}" != "200" ]]; then
  not "help/imap HTTP ${code}"
else
  if grep -q 'outlook-mobile' /tmp/m2-help-imap.html; then
    ok "posta /help/imap#outlook-mobile içerik"
  else
    not "help/imap outlook-mobile bölümü yok"
  fi
fi

echo ""
echo "—— DNS (mobil istemci host) ——"
imap_a="$(dig +short "${HOST}" A 2>/dev/null | head -1)"
if [[ -n "${imap_a}" ]]; then
  ok "A ${HOST} → ${imap_a}"
else
  not "A kaydı yok: ${HOST}"
fi

echo ""
echo "—— TLS IMAP :${PORT_IMAP} ——"
if timeout 12 bash -c "echo | openssl s_client -connect '${HOST}:${PORT_IMAP}' -servername '${HOST}' 2>/dev/null" | grep -q "BEGIN CERTIFICATE"; then
  if timeout 12 bash -c "echo | openssl s_client -connect '${HOST}:${PORT_IMAP}' -servername '${HOST}' 2>/dev/null" | grep -q "Verify return code: 0"; then
    ok "IMAP TLS sertifika doğrulandı"
  else
    warn "IMAP TLS zinciri tam doğrulanamadı (mobilde güven uyarısı çıkabilir)"
  fi
else
  not "IMAP TLS bağlantısı kurulamadı"
fi

echo ""
echo "—— SMTP submission :${PORT_SMTP} STARTTLS ——"
smtp_probe="$(timeout 15 openssl s_client -starttls smtp -connect "${SMTP_HOST}:${PORT_SMTP}" -servername "${SMTP_HOST}" -quiet -crlf 2>/dev/null <<'SMTP' || true
EHLO lerta-uat-m2
QUIT
SMTP
)"
if echo "${smtp_probe}" | grep -qiE '250.*STARTTLS|250.*AUTH'; then
  ok "SMTP STARTTLS + EHLO"
elif echo "${smtp_probe}" | grep -q '^220 '; then
  ok "SMTP 220 banner (STARTTLS)"
else
  warn "SMTP :${PORT_SMTP} yanıt yok — bash scripts/enable-postfix-submission-587.sh (root)"
fi

if command -v ss >/dev/null 2>&1; then
  if ss -tln 2>/dev/null | grep -q ":${PORT_IMAP} "; then
    ok "dinleyici :${PORT_IMAP}"
  else
    warn "yerel :${PORT_IMAP} dinleyici görünmüyor (uzak VPS dışı ortam olabilir)"
  fi
fi

echo ""
echo "—— IMAP LOGIN (parity kutu) ——"
if [[ -n "${IMAP_GOLD_PASSWORD:-}" ]] || [[ $# -ge 2 ]]; then
  PASS="${2:-${IMAP_GOLD_PASSWORD}}"
  set +e
  INSTALL_DIR="${INSTALL_DIR:-${ROOT}}" ENV_FILE="${ENV_FILE}" \
    IMAP_GOLD_EMAIL="${EMAIL}" IMAP_GOLD_PASSWORD="${PASS}" \
    bash "${ROOT}/scripts/smoke-imap-gold.sh" "${EMAIL}" "${PASS}"
  imap_rc=$?
  set -e
  if [[ "${imap_rc}" -ne 0 ]]; then
    not "IMAP gold smoke (M2 parity login)"
  else
    ok "IMAP gold smoke (M2 parity login)"
  fi
else
  echo "SKIP: IMAP_GOLD_PASSWORD yok — M1 deploy smoke veya rotate sonrası tekrar çalıştırın"
fi

echo ""
echo "MANUEL M2 imza:"
echo "  1) Outlook iOS/Android → Diğer hesap / IMAP"
echo "  2) ${EMAIL} + webmail IMAP şifresi"
echo "  3) Gelen ${HOST}:${PORT_IMAP} SSL · Giden ${SMTP_HOST}:${PORT_SMTP} STARTTLS"
echo "  4) INBOX sync + bir test maili okundu işaretle"
echo "  Rehber: docs/MAIL_THUNDERBIRD_IMAP.md · ${POSTA_BASE}/help/imap#outlook-mobile"

if [[ "${fail}" -gt 0 ]]; then
  echo "M2 sunucu hazırlık: UYARI (${fail} madde)" >&2
  exit 2
fi
echo "M2 sunucu hazırlık: PASS"
exit 0
