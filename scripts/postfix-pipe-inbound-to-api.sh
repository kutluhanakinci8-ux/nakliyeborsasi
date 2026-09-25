#!/usr/bin/env bash
# Faz C1 — Postfix pipe: stdin MIME → Lerta inbound webhook
# Usage in virtual(5):
#   user@domain.tld  "|/path/postfix-pipe-inbound-to-api.sh user@domain.tld"
set -euo pipefail

RECIPIENT="${1:?recipient address required}"
ENV_FILE="${LERTA_ENV_FILE:-/var/www/nakliyeborsasi/.env}"
API_BASE="${LERTA_INBOUND_API_BASE:-http://127.0.0.1:3010/api/v1}"

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source <(grep -E '^MAIL_INBOUND_WEBHOOK_SECRET=' "${ENV_FILE}" || true)
  set +a
fi

SECRET="${MAIL_INBOUND_WEBHOOK_SECRET:-}"
if [[ -z "${SECRET}" ]]; then
  echo "MAIL_INBOUND_WEBHOOK_SECRET missing" >&2
  exit 75
fi

RAW="$(cat)"
export RECIPIENT RAW SECRET API_BASE
python3 - <<'PY'
import json, os, re, shutil, subprocess, urllib.request

recipient = os.environ["RECIPIENT"]
raw = os.environ["RAW"]
secret = os.environ["SECRET"]
api = os.environ["API_BASE"].rstrip("/")

rspamd_score = None
rspamd_action = None
if shutil.which("rspamc"):
    try:
        proc = subprocess.run(
            ["rspamc", "symbols"],
            input=raw.encode("utf-8"),
            capture_output=True,
            timeout=25,
        )
        if proc.stdout:
            text = proc.stdout.decode("utf-8", errors="replace")
            m_score = re.search(r"score:\s*([0-9.]+)", text, re.I)
            m_action = re.search(r"action:\s*(\w+)", text, re.I)
            if m_score:
                rspamd_score = float(m_score.group(1))
            if m_action:
                rspamd_action = m_action.group(1).lower()
    except Exception:
        pass

from_hdr = re.search(r"^From:\s*(.+)$", raw, re.I | re.M)
subj_hdr = re.search(r"^Subject:\s*(.+)$", raw, re.I | re.M)
sender = (from_hdr.group(1).strip() if from_hdr else "unknown@pipe.local")
subject = (subj_hdr.group(1).strip() if subj_hdr else "(no subject)")

payload = {
    "recipient": recipient,
    "sender": sender,
    "subject": subject,
    "rawMime": raw,
}
if rspamd_score is not None:
    payload["rspamdScore"] = rspamd_score
if rspamd_action:
    payload["rspamdAction"] = rspamd_action

body = json.dumps(payload).encode("utf-8")

req = urllib.request.Request(
    f"{api}/mail/inbound/webhook",
    data=body,
    headers={
        "Content-Type": "application/json",
        "X-Lerta-Inbound-Secret": secret,
    },
    method="POST",
)
with urllib.request.urlopen(req, timeout=30) as resp:
    print(resp.read().decode())
PY
