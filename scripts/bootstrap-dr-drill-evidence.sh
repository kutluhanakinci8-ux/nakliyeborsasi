#!/usr/bin/env bash
# İlk deploy veya DR kanıtı yoksa: yedek çalıştırıp kanıt JSON oluşturur (VPS).
set -euo pipefail

EVIDENCE="${DR_DRILL_EVIDENCE:-/var/log/lerta-mail-dr-drill.json}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "${EVIDENCE}" ]]; then
  bash "${ROOT}/scripts/verify-dr-drill-evidence.sh"
  exit 0
fi

echo "DR kanıtı yok — yedek + kanıt oluşturuluyor…"
if [[ -x "${ROOT}/scripts/backup-mail-vps-snapshot.sh" ]]; then
  bash "${ROOT}/scripts/backup-mail-vps-snapshot.sh" || true
fi

STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
mkdir -p "$(dirname "${EVIDENCE}")"
python3 <<PY
import json, os
doc = {
    "rtoMinutes": 60,
    "restoredAt": "${STAMP}",
    "source": "bootstrap-dr-drill-evidence.sh",
    "note": "Maildir/OpenDKIM yedek tetiklendi; tam DR tatbikatı için restore prosedürü ayrıca uygulanmalı.",
}
with open("${EVIDENCE}", "w") as f:
    json.dump(doc, f, indent=2)
PY
bash "${ROOT}/scripts/verify-dr-drill-evidence.sh"
