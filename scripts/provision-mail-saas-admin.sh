#!/usr/bin/env bash
# Lerta Posta — ilk admin kullanıcı + kutusu (VPS’te, şifreyi repoya yazmayın).
set -euo pipefail

API_BASE="${API_BASE:-https://posta.lerta.com.tr/api/v1}"
ADMIN_EMAIL="${MAIL_SAAS_ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${MAIL_SAAS_ADMIN_PASSWORD:-}"
ADMIN_DISPLAY="${MAIL_SAAS_ADMIN_DISPLAY_NAME:-Lerta Posta Admin}"
COMPANY_NAME="${MAIL_SAAS_COMPANY_NAME:-Lerta Mail SaaS}"
MAIL_LOCAL="${MAIL_SAAS_MAIL_LOCAL_PART:-kutluhan}"

PLATFORM_EMAIL="${PLATFORM_OPERATOR_LOGIN_EMAIL:-admin@lerta.tr}"
PLATFORM_PASSWORD="${PLATFORM_OPERATOR_LOGIN_PASSWORD:-}"

if [[ -z "${ADMIN_EMAIL}" || -z "${ADMIN_PASSWORD}" ]]; then
  echo "MAIL_SAAS_ADMIN_EMAIL ve MAIL_SAAS_ADMIN_PASSWORD gerekli." >&2
  exit 1
fi

json_post() {
  local url="$1"
  local body="$2"
  local token="${3:-}"
  if [[ -n "${token}" ]]; then
    curl -sf -X POST "${url}" -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" -d "${body}"
  else
    curl -sf -X POST "${url}" -H "Content-Type: application/json" -d "${body}"
  fi
}

jwt_company_id() {
  local token="$1"
  python3 - <<'PY' "${token}"
import base64, json, sys
token = sys.argv[1]
payload = token.split(".")[1]
payload += "=" * ((4 - len(payload) % 4) % 4)
data = json.loads(base64.urlsafe_b64decode(payload))
print(data.get("companyId") or "")
PY
}

echo "==> Kullanıcı kaydı veya giriş: ${ADMIN_EMAIL}"
USER_TOKEN=""
if USER_TOKEN=$(json_post "${API_BASE}/auth/login" \
  "{\"emailAddress\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" 2>/dev/null | jq -r .accessToken) \
  && [[ -n "${USER_TOKEN}" && "${USER_TOKEN}" != "null" ]]; then
  echo "Mevcut hesap ile giriş OK."
else
  USER_TOKEN=$(json_post "${API_BASE}/auth/register" \
    "{\"emailAddress\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"displayName\":\"${ADMIN_DISPLAY}\",\"companyLegalName\":\"${COMPANY_NAME}\",\"companyCountryCode\":\"TR\",\"companyParticipantTypeCode\":\"LOAD_SHIPPER\"}" \
    | jq -r .accessToken)
  echo "Yeni firma hesabı oluşturuldu."
fi

ORG_ID=$(jwt_company_id "${USER_TOKEN}")

if [[ -z "${PLATFORM_PASSWORD}" ]]; then
  echo "ORG_ID=${ORG_ID}"
  echo "Kullanıcı hazır. Kurumsal kutu için PLATFORM_OPERATOR_LOGIN_PASSWORD ile scripti tekrar çalıştırın."
  exit 0
fi

echo "==> Platform operatör ile kutu: ${MAIL_LOCAL}@..."
PLATFORM_TOKEN=$(json_post "${API_BASE}/auth/login" \
  "{\"emailAddress\":\"${PLATFORM_EMAIL}\",\"password\":\"${PLATFORM_PASSWORD}\"}" | jq -r .accessToken)

DOMAIN_ID=$(curl -sf "${API_BASE}/platform-admin/mail/domains" \
  -H "Authorization: Bearer ${PLATFORM_TOKEN}" | jq -r '.domains[] | select(.domain=="kullanici.lerta.com.tr") | .id' | head -1)

if [[ -z "${DOMAIN_ID}" || "${DOMAIN_ID}" == "null" ]]; then
  DOMAIN_ID=$(json_post "${API_BASE}/platform-admin/mail/domains" \
    "{\"organizationId\":\"${ORG_ID}\",\"domain\":\"kullanici.lerta.com.tr\",\"domainType\":\"subdomain\",\"notes\":\"tenant shared\"}" \
    "${PLATFORM_TOKEN}" | jq -r .domain.id)
fi

curl -sf -X PATCH "${API_BASE}/platform-admin/mail/domains/${DOMAIN_ID}/verify" \
  -H "Authorization: Bearer ${PLATFORM_TOKEN}" >/dev/null

json_post "${API_BASE}/platform-admin/mail/tenant-subdomain/provision" \
  "{\"organizationId\":\"${ORG_ID}\",\"localPart\":\"${MAIL_LOCAL}\",\"displayName\":\"${ADMIN_DISPLAY}\"}" \
  "${PLATFORM_TOKEN}" | jq .

json_post "${API_BASE}/platform-admin/mail/inbound-routing/sync-postfix" "{}" "${PLATFORM_TOKEN}" >/dev/null

echo "Tamam. Giriş: ${ADMIN_EMAIL} · Kutu: ${MAIL_LOCAL}@kullanici.lerta.com.tr"
