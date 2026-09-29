#!/usr/bin/env bash
# Pilot NPS özet — data/firma-sohbeti-pilot-nps.json
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA="${PILOT_NPS_JSON:-${ROOT}/data/firma-sohbeti-pilot-nps.json}"

if [[ ! -f "${DATA}" ]]; then
  echo "SKIP: ${DATA} yok"
  exit 0
fi

python3 - "${DATA}" <<'PY'
import json, sys
path = sys.argv[1]
data = json.load(open(path))
firms = data.get("firms") or []
scored = [f for f in firms if f.get("npsScore") is not None]
wau = [f for f in firms if f.get("wauActive") is True]
promoters = sum(1 for f in scored if int(f["npsScore"]) >= 9)
detractors = sum(1 for f in scored if int(f["npsScore"]) <= 6)
n = len(scored)
nps = round(((promoters - detractors) / n) * 100) if n else None
print(f"Wave: {data.get('wave', '?')}")
print(f"Firmalar (NPS girilmiş): {n}/5")
print(f"WAU aktif: {len(wau)}/5")
if nps is not None:
    print(f"NPS: {nps} (promoters={promoters}, detractors={detractors})")
    if nps >= 40 and len(wau) >= 3:
        print("Pilot eşik: PASS (NPS≥40, WAU≥3/5)")
    else:
        print("Pilot eşik: henüz PASS değil (NPS≥40 ve WAU≥3/5)")
else:
    print("NPS: — (skor girilmedi)")
PY
