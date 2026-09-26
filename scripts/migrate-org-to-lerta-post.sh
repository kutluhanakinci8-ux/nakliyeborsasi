#!/usr/bin/env bash
# Firma kutusunu Lerta Post'a taşır (ör. abayer: info@abayer.com → info@abayer.post).
# Önkoşul: API'de instant-post branch deploy, wildcard DNS post.lerta.com.tr.
set -euo pipefail

ORG_SLUG="${ORG_SLUG:-abayer}"
LOOKUP_DOMAIN="${LOOKUP_DOMAIN:-abayer.com}"
LOCAL_PART="${LOCAL_PART:-info}"
API_BASE="${API_BASE:-https://posta.lerta.com.tr/api/v1}"

if [[ -z "${PLATFORM_ADMIN_JWT:-}" ]]; then
  echo "PLATFORM_ADMIN_JWT gerekli (platform admin oturum token)." >&2
  exit 1
fi

echo "==> Lerta Post geçişi: ${LOCAL_PART}@${ORG_SLUG}.post (lookup ${LOOKUP_DOMAIN})"
response="$(curl -sf -X POST "${API_BASE}/platform-admin/mail/instant-post/switch-primary" \
  -H "Authorization: Bearer ${PLATFORM_ADMIN_JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"lookupCustomDomain\":\"${LOOKUP_DOMAIN}\",\"orgSlug\":\"${ORG_SLUG}\",\"localPart\":\"${LOCAL_PART}\"}")"

echo "${response}"

echo "==> Postfix virtual (platform admin inbound sync veya API restart sonrası otomatik)"
echo "Tamam. Konsol özetinde adres: ${LOCAL_PART}@${ORG_SLUG}.post görünmeli."
