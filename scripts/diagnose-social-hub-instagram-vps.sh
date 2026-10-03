#!/usr/bin/env bash
# VPS üzerinde çalıştırın: Instagram DM / webhook köprü teşhisi (log + DB + token probe).
# Kullanım (sunucuda):
#   cd /var/www/nakliyeborsasi && bash scripts/diagnose-social-hub-instagram-vps.sh
# İsteğe bağlı: COMPANY_ID=... LINES=200 bash scripts/...
set -euo pipefail

INSTALL_DIR="${VPS_INSTALL_DIR:-/var/www/nakliyeborsasi}"
COMPANY_ID="${COMPANY_ID:-207f40e0-3713-4b31-8e8f-f88d9c4a1374}"
LOG_LINES="${LINES:-150}"
PM2_NAME="${PM2_API_NAME:-nakliyeborsasi-api}"

cd "${INSTALL_DIR}"

if [[ ! -f .env ]]; then
  echo "HATA: ${INSTALL_DIR}/.env bulunamadı" >&2
  exit 1
fi

# .env içinden güvenli yükleme (değerleri ekrana basmıyoruz)
set -a
# shellcheck disable=SC1091
source .env
set +a

echo "========== 1) PM2: Instagram / Meta webhook logları (son ${LOG_LINES} satır filtresi) =========="
pm2 logs "${PM2_NAME}" --lines "${LOG_LINES}" --nostream 2>/dev/null \
  | grep -iE 'instagram|Meta webhook|signature|Ingested social|Webhook route|shape:' \
  | tail -50 || echo "(log satırı yok)"

echo ""
echo "========== 2) Ortam: Instagram Login / Meta (sadece SET / UNSET) =========="
for v in \
  SOCIAL_META_APP_ID \
  SOCIAL_META_APP_SECRET \
  SOCIAL_META_INSTAGRAM_APP_ID \
  SOCIAL_META_INSTAGRAM_APP_SECRET \
  SOCIAL_META_INSTAGRAM_OAUTH_USE_LOGIN \
  SOCIAL_META_FACEBOOK_PAGE_ID \
  SOCIAL_META_INSTAGRAM_BUSINESS_ACCOUNT_ID \
  SOCIAL_HUB_WEBHOOK_DEFAULT_COMPANY_ID \
  SOCIAL_META_INSTAGRAM_SERVICE_ACCESS_TOKEN; do
  if [[ -n "${!v:-}" ]]; then
    echo "  ${v}=SET"
  else
    echo "  ${v}=UNSET"
  fi
done

echo ""
echo "========== 3) DB: webhook köprü audit (SOCIAL_HUB_WEBHOOK_*) =========="
node <<'NODE'
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.join(process.cwd(), ".env");
const env = fs.readFileSync(envPath, "utf8").split(/\r?\n/).reduce((acc, line) => {
  const t = line.trim();
  if (!t || t.startsWith("#")) return acc;
  const i = t.indexOf("=");
  if (i < 1) return acc;
  const k = t.slice(0, i);
  let v = t.slice(i + 1);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  acc[k] = v;
  return acc;
}, {});

const companyId = process.env.COMPANY_ID || "207f40e0-3713-4b31-8e8f-f88d9c4a1374";

(async () => {
  const c = new Client({ connectionString: env.DATABASE_URL });
  await c.connect();

  const audit = await c.query(
    `SELECT "actionCode", "createdAt", metadata
     FROM audit_logs
     WHERE "actorCompanyId" = $1
       AND "actionCode" LIKE 'SOCIAL_HUB_WEBHOOK%'
     ORDER BY "createdAt" DESC
     LIMIT 20`,
    [companyId],
  );
  if (audit.rows.length === 0) {
    console.log("  (son 20 kayıt: yok — Instagram köprü henüz tetiklenmemiş olabilir)");
  } else {
    for (const row of audit.rows) {
      const meta = row.metadata ? JSON.stringify(row.metadata) : "";
      console.log(`  ${row.createdAt.toISOString()} ${row.actionCode} ${meta}`);
    }
  }

  const tables = await c.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name ILIKE '%social%'
     ORDER BY 1`,
  );
  console.log("\n  social* tablolar:", tables.rows.map((r) => r.table_name).join(", ") || "(yok)");

  const conn = await c.query(
    `SELECT "platformCode", "statusCode", "updatedAt", "grantedScopes", "externalAccountId", "lastErrorMessage"
     FROM company_social_connections
     WHERE "companyId" = $1 AND "platformCode" = 'INSTAGRAM'
     LIMIT 1`,
    [companyId],
  );

  if (conn.rows[0]) {
    const row = conn.rows[0];
    let meta = {};
    try {
      meta = row.grantedScopes ? JSON.parse(row.grantedScopes) : {};
    } catch {
      meta = { rawGrantedScopes: String(row.grantedScopes || "").slice(0, 120) };
    }
    console.log("\n========== 4) DB: INSTAGRAM bağlantı (token yok) ==========");
    console.log(
      JSON.stringify(
        {
          status: row.statusCode,
          externalAccountId: row.externalAccountId,
          updatedAt: row.updatedAt,
          lastError: row.lastErrorMessage,
          instagramAuthMode: meta.instagramAuthMode,
          instagramLoginUserId: meta.instagramLoginUserId,
          instagramBusinessAccountId: meta.instagramBusinessAccountId,
          pageId: meta.pageId,
        },
        null,
        2,
      ),
    );
  } else {
    console.log("\n  company_social_connections INSTAGRAM satırı bulunamadı");
  }

  await c.end();
})().catch((e) => {
  console.error("DB hata:", e.message);
  process.exit(1);
});
NODE

echo ""
echo "========== 5) Graph probe (SOCIAL_META_INSTAGRAM_SERVICE_ACCESS_TOKEN varsa) =========="
if [[ -n "${SOCIAL_META_INSTAGRAM_SERVICE_ACCESS_TOKEN:-}" ]]; then
  ME_JSON="$(curl -fsS "https://graph.instagram.com/me?fields=id,username&access_token=${SOCIAL_META_INSTAGRAM_SERVICE_ACCESS_TOKEN}" 2>/dev/null || echo '{"error":"curl_failed"}')"
  echo "  service graph.instagram.com/me: ${ME_JSON}"
  SUB_JSON="$(curl -fsS "https://graph.instagram.com/me/subscribed_apps?access_token=${SOCIAL_META_INSTAGRAM_SERVICE_ACCESS_TOKEN}" 2>/dev/null || echo '{"error":"curl_failed"}')"
  echo "  subscribed_apps: ${SUB_JSON}"
else
  echo "  (SOCIAL_META_INSTAGRAM_SERVICE_ACCESS_TOKEN UNSET — şirket token probe atlandı)"
fi

echo ""
echo "========== Teşhis özeti =========="
echo "  • messages=0 + kinds=[read]  → Meta IG webhook geliyor; DM (message) eventi henüz yok."
echo "  • kinds=[message] görürseniz → köprü audit ve gelen kutusunu kontrol edin."
echo "  • signature mismatch       → genelde SOCIAL_META_APP_SECRET ile IG Login app secret farkı (işlem yine devam eder)."
echo "  • Dev modda DM: Instagram uygulama Tester rolü + @lertalogistics'e metin DM."
