#!/usr/bin/env bash
# IMAP gold smoke — Dovecot SSL LOGIN, klasörler, INBOX erişimi (Thunderbird/Apple öncesi otomasyon).
set -euo pipefail

EMAIL="${1:-${IMAP_GOLD_EMAIL:-}}"
PASS="${2:-${IMAP_GOLD_PASSWORD:-}}"
ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"

if [[ -z "${EMAIL}" ]]; then
  echo "Kullanım: $0 <mailbox@domain> [imap_password]" >&2
  echo "  veya IMAP_GOLD_EMAIL + IMAP_GOLD_PASSWORD" >&2
  exit 1
fi

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1091
  source <(grep -E '^(MAIL_IMAP|MAIL_PLATFORM_TENANT_DOMAIN)=' "${ENV_FILE}" || true)
fi

HOST="${MAIL_IMAP_HOST:-mail.lerta.com.tr}"
PORT="${MAIL_IMAP_PORT:-993}"

ROOT="${INSTALL_DIR}"
if [[ -x "${ROOT}/scripts/verify-dovecot-imap-pm5.sh" ]]; then
  echo "== PM-5 maildir iskeleti =="
  bash "${ROOT}/scripts/verify-dovecot-imap-pm5.sh" "${EMAIL}" "${ENV_FILE}"
fi

if [[ -z "${PASS}" ]]; then
  BOOTSTRAP="${LERTA_IMAP_BOOTSTRAP_FILE:-/root/lerta-imap-credentials-bootstrap.txt}"
  if [[ -r "${BOOTSTRAP}" ]]; then
    line="$(grep -F "${EMAIL}" "${BOOTSTRAP}" 2>/dev/null | tail -1 || true)"
    if [[ -n "${line}" ]]; then
      PASS="$(awk '{print $NF}' <<<"${line}")"
      echo "OK: şifre bootstrap (${BOOTSTRAP})"
    fi
  fi
fi

if [[ -z "${PASS}" ]]; then
  echo "IMAP şifresi gerekli (arg2, IMAP_GOLD_PASSWORD veya bootstrap)." >&2
  echo "Webmail: Ayarlar → IMAP şifresi yenile · VPS: rotate-imap-credential-vps.sh" >&2
  exit 2
fi

echo "== Dovecot auth =="
if command -v doveadm >/dev/null 2>&1; then
  auth_out="$(doveadm auth test "${EMAIL}" "${PASS}" 2>&1)" || true
  if echo "${auth_out}" | grep -q "auth succeeded"; then
    echo "OK: doveadm auth"
  elif echo "${auth_out}" | grep -q "Couldn't connect to auth socket"; then
    echo "UYARI: doveadm auth socket yok — IMAP LOGIN ile doğrulanacak"
  else
    echo "NOT: doveadm auth başarısız" >&2
    echo "${auth_out}" | sed 's/'"${PASS}"'/***REDACTED***/g' >&2
    exit 3
  fi
fi

echo "== IMAP SSL (LIST + INBOX) =="
export IMAP_GOLD_HOST="${HOST}" IMAP_GOLD_PORT="${PORT}" IMAP_GOLD_EMAIL="${EMAIL}" IMAP_GOLD_PASS="${PASS}"
python3 <<'PY'
import imaplib
import os
import re
import ssl
import sys

host = os.environ["IMAP_GOLD_HOST"]
port = int(os.environ.get("IMAP_GOLD_PORT", "993"))
user = os.environ["IMAP_GOLD_EMAIL"]
password = os.environ["IMAP_GOLD_PASS"]

insecure = os.environ.get("IMAP_GOLD_SSL_INSECURE", "").lower() in ("1", "true", "yes")
ctx = ssl.create_default_context()
if insecure:
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
try:
    client = imaplib.IMAP4_SSL(host, port, ssl_context=ctx)
except OSError as exc:
    print(f"NOT: IMAP bağlantı {host}:{port} — {exc}", file=sys.stderr)
    sys.exit(10)

try:
    client.login(user, password)
except imaplib.IMAP4.error as exc:
    print(f"NOT: LOGIN — {exc}", file=sys.stderr)
    sys.exit(11)

typ, data = client.list()
if typ != "OK":
    print("NOT: LIST başarısız", file=sys.stderr)
    sys.exit(12)

raw = b" ".join(data or []).decode("utf-8", errors="replace")
names: list[str] = []
for line in data or []:
    if not line:
        continue
    text = line.decode("utf-8", errors="replace")
    m = re.search(r'"([^"]+)"\s*$', text)
    if m:
        names.append(m.group(1))
    elif text.rsplit(" ", 1)[-1]:
        names.append(text.rsplit(" ", 1)[-1].strip('"'))

def has_folder(keyword: str) -> bool:
    return any(keyword in n.lower().replace(".", "") for n in names)

missing = [k for k in ("sent", "archive", "trash", "junk") if not has_folder(k)]
if missing:
    print(f"NOT: eksik IMAP klasörleri {missing}: {names}", file=sys.stderr)
    sys.exit(13)

print(f"OK: LIST ({len(names)} klasör): {', '.join(sorted(names)[:12])}{'…' if len(names) > 12 else ''}")

typ, _ = client.select("INBOX", readonly=True)
if typ != "OK":
    print("NOT: INBOX SELECT", file=sys.stderr)
    sys.exit(14)

typ, ids = client.search(None, "ALL")
count = len(ids[0].split()) if typ == "OK" and ids and ids[0] else 0
print(f"OK: INBOX mesaj sayısı (IMAP): {count}")

client.logout()
print("OK: IMAP gold smoke tamam")
PY

echo ""
echo "Manuel: docs/MAIL_IMAP_GOLD_SMOKE.md (Thunderbird + Apple Mail adımları)"
