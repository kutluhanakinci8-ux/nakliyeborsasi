#!/usr/bin/env bash
# Pilot NPS: PILOT_NPS_STRICT=1 ise tamamlanmış 5 skor zorunlu; aksi halde SKIP/rapor.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA="${PILOT_NPS_JSON:-${ROOT}/data/firma-sohbeti-pilot-nps.json}"

echo "== Pilot NPS verify =="
if [[ ! -f "${DATA}" ]]; then
  if [[ "${PILOT_NPS_STRICT:-}" == "1" ]]; then
    echo "FAIL: ${DATA} yok"
    exit 1
  fi
  echo "SKIP: pilot NPS veri dosyası yok"
  exit 0
fi

bash "${ROOT}/scripts/report-firma-sohbeti-pilot-nps.sh"

if [[ "${PILOT_NPS_STRICT:-}" != "1" ]]; then
  echo "Pilot NPS verify: SKIP (PILOT_NPS_STRICT!=1)"
  exit 0
fi

python3 - "${DATA}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
firms = data.get("firms") or []
if len(firms) < 5:
    raise SystemExit("FAIL: 5 pilot slot gerekli")
for f in firms:
    if not (f.get("legalName") or "").strip():
        raise SystemExit(f"FAIL: slot {f.get('slot')} legalName boş")
    if f.get("npsScore") is None:
        raise SystemExit(f"FAIL: slot {f.get('slot')} npsScore boş")
    if f.get("wauActive") is None:
        raise SystemExit(f"FAIL: slot {f.get('slot')} wauActive boş")
scored = [int(f["npsScore"]) for f in firms]
promoters = sum(1 for s in scored if s >= 9)
detractors = sum(1 for s in scored if s <= 6)
nps = ((promoters - detractors) / len(scored)) * 100
wau = sum(1 for f in firms if f.get("wauActive") is True)
if nps < 40:
    raise SystemExit(f"FAIL: NPS {nps:.0f} < 40")
if wau < 3:
    raise SystemExit(f"FAIL: WAU {wau}/5 < 3")
print("Pilot NPS verify: PASS")
PY
