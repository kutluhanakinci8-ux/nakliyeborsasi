#!/usr/bin/env bash
# Mevcut companies → paylaşımlı @lerta.com.tr gönderen + mail_mailbox (VPS, psql).
# Admin (admin@lerta.tr org): info@lerta.com.tr
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"
TENANT_DOMAIN="${MAIL_PLATFORM_TENANT_DOMAIN:-lerta.com.tr}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
source <(grep -E '^DATABASE_URL=' "${ENV_FILE}")
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL missing" >&2
  exit 1
fi

echo "=== mail_domains: ${TENANT_DOMAIN} (verified) ==="
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO mail_domains (
  id, "organizationId", domain, "domainType", "verificationStatus", notes, "dnsSnapshot", "createdAt", "updatedAt"
)
SELECT uuid_generate_v4(), NULL, '${TENANT_DOMAIN}', 'subdomain', 'verified',
       'Paylaşımlı tenant — tüm firmalar @${TENANT_DOMAIN}', '{}'::jsonb, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM mail_domains WHERE domain = '${TENANT_DOMAIN}');

UPDATE mail_domains
SET "verificationStatus" = 'verified',
    "domainType" = 'subdomain',
    notes = COALESCE(notes, 'Paylaşımlı tenant')
WHERE domain = '${TENANT_DOMAIN}';
SQL

DOMAIN_ID="$(psql "${DATABASE_URL}" -At -c "SELECT id FROM mail_domains WHERE domain = '${TENANT_DOMAIN}' LIMIT 1;")"
if [[ -z "${DOMAIN_ID}" ]]; then
  echo "mail_domains row missing for ${TENANT_DOMAIN}" >&2
  exit 1
fi
echo "Domain id: ${DOMAIN_ID}"

provision_one() {
  local org_id="$1"
  local local_part="$2"
  local display_name="$3"
  local_part="${local_part,,}"
  local email="${local_part}@${TENANT_DOMAIN}"
  display_name="${display_name//\'/\'\'}"
  if ! psql "${DATABASE_URL}" -At -c "SELECT 1 FROM companies WHERE id='${org_id}'::uuid;" | grep -q 1; then
    echo "skip unknown org ${org_id}"
    return 0
  fi
  local existing
  existing="$(psql "${DATABASE_URL}" -At -c "SELECT id FROM mail_sender_identity WHERE \"mailDomainId\"='${DOMAIN_ID}'::uuid AND \"localPart\"='${local_part}' LIMIT 1;" || true)"
  if [[ -n "${existing}" ]]; then
    psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c "
      UPDATE mail_sender_identity SET \"isDefault\"=true, \"displayName\"='${display_name}' WHERE id='${existing}'::uuid;
    "
  else
    psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c "
      UPDATE mail_sender_identity SET \"isDefault\"=false WHERE \"organizationId\"='${org_id}'::uuid;
      INSERT INTO mail_sender_identity (id, \"mailDomainId\", \"organizationId\", \"localPart\", \"displayName\", purpose, \"isDefault\", \"createdAt\", \"updatedAt\")
      VALUES (uuid_generate_v4(), '${DOMAIN_ID}'::uuid, '${org_id}'::uuid, '${local_part}', '${display_name}', 'transactional', true, now(), now());
    "
  fi
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c "
    INSERT INTO mail_mailbox (id, \"organizationId\", \"emailAddress\", status, \"quotaBytes\", \"createdAt\", \"updatedAt\")
    SELECT uuid_generate_v4(), '${org_id}'::uuid, '${email}', 'active', 0, now(), now()
    WHERE NOT EXISTS (
      SELECT 1 FROM mail_mailbox WHERE \"organizationId\"='${org_id}'::uuid AND \"emailAddress\"='${email}'
    );
  "
  echo "OK ${email} (${org_id})"
}

echo "=== Provisioning senders ==="
# org_id|localPart|displayName
while IFS='|' read -r org_id local_part display_name; do
  [[ -z "${org_id}" || "${org_id}" =~ ^# ]] && continue
  provision_one "${org_id}" "${local_part}" "${display_name}"
done <<'MAP'
6949c70a-eed6-47c7-8fca-6f41e1344377|info|Lerta Platform
207f40e0-3713-4b31-8e8f-f88d9c4a1374|nakliyeborsasi|Nakliye Borsası Platform Yönetimi
f4587610-cff1-4b8b-972d-0de5da7c11f2|anadolugida|Anadolu Gıda Lojistik
4414a4a0-9bb3-4e87-ac6c-34ef44fc94bb|egetekstil|Ege Tekstil İhracat
e3304ef2-1c40-4af1-ba85-130e523e1f22|marmaraotomotiv|Marmara Otomotiv Yan Sanayi
097ab0b9-0860-4a5b-a221-d931dbbc8c01|karadenizorman|Karadeniz Orman Ürünleri
0afb6dab-6f2c-4d81-a3e1-629c63feadce|icanadolitarim|İç Anadolu Tarım Kooperatifi
8a550d55-0f76-40f5-b4aa-c0d9b92af11d|atlatasimacilik|Atlas Taşımacılık A.Ş.
14928f0a-5f93-49a3-a2a0-66dbdedfe978|doguavrupafilo|Doğu Avrupa Filo
93b7f43a-137f-4267-a94b-09eea1289799|koridorexpress|Koridor Express
e09f4dba-ee0c-4f88-a708-f06ff8c54cd5|bosphoruslogistics|Bosphorus Logistics
d281e012-74bd-469f-b0cc-a692f3deebc0|steppecargo|Steppe Cargo UA
14f1cc43-5101-4619-b026-c2035f9b6333|bnkdepolama|Bnk Depolama Lojistik AŞ
5374dadf-923c-4c6b-99fa-84dd6078ac22|enakliyat|Enakliyat Bilgi ve İletişim
e141fa66-aa1d-4a53-a221-8b70682fe628|kutluhanlogistics|Kutluhan Test Taşımacılık
c03788c6-0606-463e-a004-bdcd1e03a853|hancinakliyat|hancı nakliyat
b3e47128-fc48-4c5e-be58-5e748d36b083|almanyalojistik|almanya lojistik
6e49a730-769b-4c79-a048-c3b40903f523|lertalogistics|Lerta Logistics
2b6022fd-f187-4fef-ad4e-5bf586378313|kutluhan|Lerta Mail SaaS
abb33a13-2600-4389-bb66-1147f419754f|abayerdeneme|Abayer Deneme
17113410-7848-474d-9204-537d0261f9b6|abayer|abayer
MAP

echo "=== Senders on ${TENANT_DOMAIN} ==="
psql "${DATABASE_URL}" -c "SELECT s.\"localPart\", left(c.\"legalName\",40), s.\"organizationId\" FROM mail_sender_identity s JOIN mail_domains d ON d.id=s.\"mailDomainId\" JOIN companies c ON c.id=s.\"organizationId\" WHERE d.domain='${TENANT_DOMAIN}' ORDER BY s.\"localPart\";"

if [[ -x "${INSTALL_DIR}/scripts/fix-postfix-inbound-pipe-transport.sh" ]]; then
  bash "${INSTALL_DIR}/scripts/fix-postfix-inbound-pipe-transport.sh"
fi

echo "=== API restart (Postfix virtual sync) ==="
if [[ -f "${INSTALL_DIR}/scripts/restart-api.sh" ]]; then
  bash "${INSTALL_DIR}/scripts/restart-api.sh" || true
fi

echo "=== Done ==="
