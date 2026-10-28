#!/usr/bin/env bash
# Statik Lerta logosu (kanat + LERTA) — animasyon yok, keskin kenar, altın renk.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IN="${ROOT}/apps/mail-marketing/public/brand/lerta-hero-animation.mp4"
OUT_1X="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-static.png"
OUT_2X="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-static@2x.png"
OUT_HEADER="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-header.png"

command -v ffmpeg >/dev/null

read -r -d '' FC <<'EOF' || true
[0:v]select=eq(n\,29),crop=420:230:46:28,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(r(X,Y)+g(X,Y),108),0,if(gt(r(X,Y),92)*gt(g(X,Y),70)*gt(r(X,Y),b(X,Y)+8)*gt(g(X,Y),b(X,Y)+4),255,0))'[out]
EOF

ffmpeg -y -i "${IN}" \
  -filter_complex "${FC}" \
  -map "[out]" \
  -frames:v 1 -update 1 \
  "${OUT_1X}"

ffmpeg -y -i "${OUT_1X}" \
  -vf "scale=840:460:flags=lanczos" \
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
if alpha < 3000:
    sys.exit(f"HATA: logo çok silik (alpha piksel {alpha})")
print("OK: alpha piksel", alpha)
PY

echo "OK: ${OUT_1X}"
echo "OK: ${OUT_2X}"
