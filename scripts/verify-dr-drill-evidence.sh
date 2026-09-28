#!/usr/bin/env bash
# DR tatbikatı kanıt dosyası (ops oluşturur).
set -euo pipefail
EVIDENCE="${DR_DRILL_EVIDENCE:-/var/log/lerta-mail-dr-drill.json}"
if [[ ! -f "$EVIDENCE" ]]; then
  echo "FAIL: DR kanıt dosyası yok: $EVIDENCE" >&2
  echo "Örnek: echo '{\"rtoMinutes\":45,\"restoredAt\":\"...\"}' > $EVIDENCE" >&2
  exit 1
fi
python3 -c "import json; d=json.load(open('$EVIDENCE')); assert 'rtoMinutes' in d"
echo "OK: DR evidence $EVIDENCE"
