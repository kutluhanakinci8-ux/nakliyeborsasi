#!/usr/bin/env bash
# Son veya verilen jsonl yedeğinden email_social_links geri yükler (yalnızca boş org satırları).
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
BACKUP_FILE="${2:-}"

if [[ -f "${INSTALL_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${INSTALL_DIR}/.env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "HATA: DATABASE_URL gerekli" >&2
  exit 1
fi

if [[ -z "${BACKUP_FILE}" ]]; then
  BACKUP_FILE="$(ls -1t "${INSTALL_DIR}/backups/mail-email-social-links"/email_social_links-*.jsonl 2>/dev/null | head -1 || true)"
fi

if [[ -z "${BACKUP_FILE}" || ! -f "${BACKUP_FILE}" ]]; then
  echo "HATA: yedek dosyası bulunamadı" >&2
  exit 1
fi

export BACKUP_FILE DATABASE_URL
node <<'NODE'
const fs = require("fs");
const { execFileSync } = require("child_process");
const file = process.env.BACKUP_FILE;
const db = process.env.DATABASE_URL;
const lines = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
let restored = 0;
for (const line of lines) {
  const row = JSON.parse(line);
  const org = row.organizationId;
  const links = row.email_social_links;
  if (!org || !Array.isArray(links) || links.length === 0) continue;
  const sql = `UPDATE mail_organization_branding SET email_social_links = $1::jsonb, "updatedAt" = NOW() WHERE "organizationId" = $2::uuid AND (email_social_links IS NULL OR jsonb_array_length(COALESCE(email_social_links, '[]'::jsonb)) = 0);`;
  execFileSync(
    "psql",
    [
      db,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `UPDATE mail_organization_branding SET email_social_links = '${JSON.stringify(links).replace(/'/g, "''")}'::jsonb, "updatedAt" = NOW() WHERE "organizationId" = '${org}'::uuid AND (email_social_links IS NULL OR jsonb_array_length(COALESCE(email_social_links, '[]'::jsonb)) = 0);`,
    ],
    { stdio: "inherit" },
  );
  restored += 1;
}
console.log(`OK: restore denendi (${restored} yedek satırı işlendi)`);
NODE
