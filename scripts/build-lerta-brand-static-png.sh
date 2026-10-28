#!/usr/bin/env bash
# Statik logo — kullanıcı master PNG (net altın); video/ffmpeg maske YOK.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MASTER="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-master.png"
OUT_1X="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-static.png"
OUT_2X="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-static@2x.png"
OUT_HEADER="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-header.png"

command -v ffmpeg >/dev/null
test -f "${MASTER}"

# Kanat + LERTA (alt slogan satırı hariç). Koyu zemin → şeffaf alpha.
read -r -d '' VF <<'EOF' || true
crop=610:268:18:68,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(r(X,Y)+g(X,Y)+b(X,Y),52),0,255)'
EOF

ffmpeg -y -i "${MASTER}" \
  -vf "${VF}" \
  -frames:v 1 -update 1 \
  "${OUT_1X}"

ffmpeg -y -i "${OUT_1X}" \
  -vf "scale=1220:536:flags=lanczos" \
  -frames:v 1 -update 1 \
  "${OUT_2X}"

cp "${OUT_2X}" "${OUT_HEADER}"

python3 - <<PY
import subprocess
import sys
path = "${OUT_2X}"
p = subprocess.run(
    ["ffmpeg", "-y", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
    stdout=subprocess.PIPE,
    stderr=subprocess.DEVNULL,
)
d = p.stdout
alpha = sum(1 for i in range(len(d) // 4) if d[i * 4 + 3] > 128)
if alpha < 8000:
    sys.exit(f"HATA: master export zayıf (alpha {alpha})")
print("OK: alpha", alpha)
PY

echo "OK: ${OUT_1X}"
echo "OK: ${OUT_2X}"
