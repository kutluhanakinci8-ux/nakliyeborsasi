#!/usr/bin/env bash
# UAT M3 (Graph) + M4 (Google Calendar) — VPS .env anahtar varlığı (değer yazdırılmaz).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${INSTALL_DIR:-${ROOT}}/.env}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "FAIL: ${ENV_FILE} yok" >&2
  exit 1
fi

graph_ok=0
google_ok=0
failed=0

check_key() {
  local key="$1"
  if grep -qE "^${key}=.+" "${ENV_FILE}" 2>/dev/null; then
    echo "SET  ${key}"
    return 0
  fi
  echo "MISS ${key}"
  return 1
}

echo "=== M3 Microsoft Graph / Exchange OAuth ==="
graph_keys=(
  MICROSOFT_GRAPH_MAIL_CLIENT_ID
  MICROSOFT_GRAPH_MAIL_CLIENT_SECRET
  MICROSOFT_GRAPH_MAIL_REDIRECT_URI
)
for k in "${graph_keys[@]}"; do
  check_key "${k}" && graph_ok=$((graph_ok + 1)) || failed=$((failed + 1))
done
if [[ "${graph_ok}" -eq 3 ]]; then
  echo "OK: Graph mail OAuth env tam"
  if [[ "${VERIFY_GRAPH_LIVE:-1}" != "0" ]]; then
    graph_live="$(
      set -a
      # shellcheck disable=SC1090
      source "${ENV_FILE}"
      set +a
      curl -sS -X POST "https://login.microsoftonline.com/common/oauth2/v2.0/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        --data-urlencode "client_id=${MICROSOFT_GRAPH_MAIL_CLIENT_ID}" \
        --data-urlencode "client_secret=${MICROSOFT_GRAPH_MAIL_CLIENT_SECRET}" \
        --data-urlencode "grant_type=authorization_code" \
        --data-urlencode "code=__lerta_verify__" \
        --data-urlencode "redirect_uri=${MICROSOFT_GRAPH_MAIL_REDIRECT_URI}" 2>/dev/null || true
    )"
    if echo "${graph_live}" | grep -qE '"error"[[:space:]]*:[[:space:]]*"invalid_grant"'; then
      echo "OK: Graph client_id + client_secret tanınıyor (invalid_grant beklenen)"
    elif echo "${graph_live}" | grep -qi 'invalid_client\|client secret\|AADSTS7000215'; then
      echo "FAIL: Graph client_secret geçersiz — Azure → Certificates & secrets"
      failed=$((failed + 1))
    else
      echo "WARN: Graph canlı doğrulama belirsiz"
    fi
  fi
else
  echo "NOT: Graph mail OAuth eksik — docs/MAIL_GRAPH_CALENDAR.md · .env.example"
fi

echo ""
echo "=== M4 Google Calendar OAuth ==="
google_keys=(
  GOOGLE_CALENDAR_CLIENT_ID
  GOOGLE_CALENDAR_CLIENT_SECRET
  GOOGLE_CALENDAR_REDIRECT_URI
)
for k in "${google_keys[@]}"; do
  check_key "${k}" && google_ok=$((google_ok + 1)) || true
done
if [[ "${google_ok}" -eq 3 ]]; then
  echo "OK: Google Calendar OAuth env tam"
else
  echo "NOTE: Google Calendar OAuth eksik (isteğe bağlı) — docs/MAIL_GOOGLE_CALENDAR.md"
fi

echo ""
echo "=== CAP Gmail posta OAuth (isteğe bağlı push ile) ==="
gmail_ok=0
gmail_keys=(
  GOOGLE_GMAIL_CLIENT_ID
  GOOGLE_GMAIL_CLIENT_SECRET
  GOOGLE_GMAIL_REDIRECT_URI
)
for k in "${gmail_keys[@]}"; do
  check_key "${k}" && gmail_ok=$((gmail_ok + 1)) || failed=$((failed + 1))
done
if [[ "${gmail_ok}" -eq 3 ]]; then
  echo "OK: Gmail posta OAuth env tam"
  if [[ "${VERIFY_GMAIL_LIVE:-1}" != "0" ]]; then
    # invalid_grant = client_id + secret accepted; invalid_client = yanlış secret veya client
    gmail_live="$(
      set -a
      # shellcheck disable=SC1090
      source "${ENV_FILE}"
      set +a
      curl -sS -X POST "https://oauth2.googleapis.com/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        --data-urlencode "client_id=${GOOGLE_GMAIL_CLIENT_ID}" \
        --data-urlencode "client_secret=${GOOGLE_GMAIL_CLIENT_SECRET}" \
        --data-urlencode "code=__lerta_verify__" \
        --data-urlencode "redirect_uri=${GOOGLE_GMAIL_REDIRECT_URI}" \
        --data-urlencode "grant_type=authorization_code" 2>/dev/null || true
    )"
    if echo "${gmail_live}" | grep -q '"error"[[:space:]]*:[[:space:]]*"invalid_grant"'; then
      echo "OK: Gmail client_id + client_secret Google tarafından tanınıyor"
    elif echo "${gmail_live}" | grep -q 'client secret is invalid'; then
      echo "FAIL: Gmail client_secret geçersiz — Google Cloud → Credentials → OAuth client → yeni secret"
      failed=$((failed + 1))
    elif echo "${gmail_live}" | grep -q '"error"[[:space:]]*:[[:space:]]*"invalid_client"'; then
      echo "FAIL: Gmail OAuth client_id/secret eşleşmiyor veya client silindi"
      failed=$((failed + 1))
    else
      echo "WARN: Gmail canlı doğrulama belirsiz (ağ veya yanıt değişti)"
    fi
  fi
else
  echo "NOT: Gmail posta OAuth eksik — docs/MAIL_OAUTH_VPS_SETUP.md §2b"
fi
if check_key "GOOGLE_GMAIL_PUBSUB_TOPIC"; then
  echo "HINT: Pub/Sub push için GOOGLE_GMAIL_PUBSUB_PUSH_SECRET + header x-lerta-gmail-push-secret önerilir"
fi

echo ""
echo "Redirect URI örnekleri (.env.example):"
echo "  https://posta.lerta.com.tr/mail/exchange-oauth"
echo "  https://posta.lerta.com.tr/mail/calendar-oauth"
echo "  https://posta.lerta.com.tr/mail/google-calendar-oauth"

if [[ "${graph_ok}" -eq 3 && "${google_ok}" -eq 3 ]]; then
  exit 0
fi
exit 2
