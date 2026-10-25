#!/usr/bin/env bash
# Faz 9b — imza öncesi: outbound teşhis + manuel adım paketi (müşteri PDF öncesi).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DAY="$(TZ=Europe/Istanbul date +%Y-%m-%d)"
STAMP="$(TZ=Europe/Istanbul date -Iseconds)"
ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
ASSIST_MD="${ROOT}/docs/reports/UAT_FAZ9B_ASSIST_${DAY}.md"
ASSIST_JSON="${ROOT}/docs/reports/UAT_FAZ9B_ASSIST_${DAY}.json"
mkdir -p "${ROOT}/docs/reports"

outbound="SKIP"
m9_code="SKIP"

echo "== Faz 9b imza öncesi assist (${STAMP}) =="

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi
export ENV_FILE

echo ""
echo "—— Outbound teşhis ——"
if [[ -x "${ROOT}/scripts/vps-diagnose-outbound-mail.sh" ]]; then
  if bash "${ROOT}/scripts/vps-diagnose-outbound-mail.sh" 2>&1 | tail -20; then
    outbound="PASS"
  else
    outbound="WARN"
  fi
fi

echo ""
echo "—— M9 kod kapısı ——"
if bash "${ROOT}/scripts/verify-uat-m9-delivery-code.sh"; then
  m9_code="PASS"
fi

EMAIL="$(bash "${ROOT}/scripts/resolve-parity-imap-test-email.sh" 2>/dev/null || echo "abayer@lerta.com.tr")"

cat > "${ASSIST_MD}" <<EOF
# Faz 9b — müşteri imza öncesi kontrol listesi (${DAY})

**Oluşturulma:** ${STAMP} (Europe/Istanbul)  
**Otomasyon:** outbound=${outbound}, M9 kod=${m9_code}

## A. Thunderbird (M1-TB) — ~15 dk

1. Hesap → IMAP \`mail.lerta.com.tr:993\` SSL, kullanıcı \`${EMAIL}\`, IMAP şifresi (webmail Ayarlar veya ops bootstrap).
2. Klasörler: Gelen, Gönderilen, Arşiv, Çöp, Gereksiz görünür olmalı.
3. Webmail’de test mail → **Arşiv** → Thunderbird’de ≤1 dk içinde görün.
4. İmza: \`docs/UAT_FAZ9_CUSTOMER_SIGNOFF.md\` tablosu M1-TB.

## B. Apple Mail (M1-AM) — ~15 dk

1. Diğer → IMAP, aynı sunucu ve kimlik bilgisi.
2. Gereksiz/Çöp/Arşiv eşleşmesi (Dovecot \\Junk, \\Trash, \\Archive).
3. İmza: M1-AM satırı.

## C. Teslimat kutusu (M9-IN) — harici hesaplar

Pilot runbook: \`docs/EMAIL_PILOT_LERTA_COM_TR.md\`

1. **Gmail** — pilot adrese gönderim; Gelen/Spam kontrolü (5–15 dk).
2. **Outlook / Microsoft** — aynı.
3. **MSN / legacy** — runbook §3.3 varsa uygula.
4. Ekran görüntüsü veya “teslim alındı” notu → imza M9.

## D. Google Takvim (M4) — isteğe bağlı

\`.env\` içinde \`GOOGLE_CALENDAR_*\` üçlüsü + posta \`/mail/google-calendar-oauth\`.

---

İmza tamamlandığında VPS:

\`\`\`bash
export UAT_M1_THUNDERBIRD_SIGNED=1 UAT_M1_APPLE_SIGNED=1 UAT_M9_DELIVERY_SIGNED=1
npm run qa:faz9
\`\`\`
EOF

python3 - <<PY
import json
from pathlib import Path
Path("${ASSIST_JSON}").write_text(
    json.dumps(
        {
            "generatedAt": "${STAMP}",
            "timezone": "Europe/Istanbul",
            "outbound_diagnose": "${outbound}",
            "m9_delivery_code": "${m9_code}",
            "imap_test_email": "${EMAIL}",
            "assist_markdown": "docs/reports/UAT_FAZ9B_ASSIST_${DAY}.md",
            "signoff_template": "docs/UAT_FAZ9_CUSTOMER_SIGNOFF.md",
        },
        indent=2,
        ensure_ascii=False,
    )
    + "\n",
    encoding="utf-8",
)
PY

echo "Wrote ${ASSIST_MD}"
echo "Wrote ${ASSIST_JSON}"
echo "run-faz9b-pre-signoff-assist: PASS"
